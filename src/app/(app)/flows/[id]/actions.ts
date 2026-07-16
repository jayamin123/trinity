"use server";
import { db } from "@/lib/db";
import {
  parseFlowSettings, parseFirePlan, flowCardSource,
  type FirePlan, type CCProduct,
} from "@/lib/flows";
import { pullTopupFromPool, pullUnlimForFlow } from "@/lib/cards";
import { randomDailyCounts, stratifiedTimesForDay } from "@/lib/schedule";
import { nowBkk, calendarDateBkk } from "@/lib/bkk";
import { listProducts as listCCProducts, listGateways } from "@/lib/checkoutchamp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** A flow is "fresh" when no schedule has fired or is in flight — meaning
 *  nothing has touched the user's CC account yet. Fresh flows can be edited
 *  freely or deleted; used flows are mostly locked to preserve fire history. */
async function flowIsFresh(flowId: string): Promise<boolean> {
  const used = await db.schedule.count({
    where: { flowId, OR: [{ status: "fired" }, { status: "processing" }] },
  });
  return used === 0;
}

/** Flip the flow's lifecycle status. No delete action exposed — we never want
 *  to lose fire history. (FK is also RESTRICT at the DB level.) */

export async function pauseFlow(id: string) {
  const flow = await db.flow.findUnique({ where: { id } });
  if (!flow) return;
  const settings = parseFlowSettings(flow.flowSettings);
  settings.lifecycle.status = "paused";
  settings.lifecycle.paused_at = nowBkk().toISOString();
  await db.flow.update({ where: { id }, data: { flowSettings: JSON.stringify(settings) } });
  revalidatePath(`/flows/${id}`);
}

export async function resumeFlow(id: string) {
  const flow = await db.flow.findUnique({ where: { id } });
  if (!flow) return;
  const settings = parseFlowSettings(flow.flowSettings);
  if (!settings.lifecycle.paused_at) return;

  const pauseMs = nowBkk().getTime() - new Date(settings.lifecycle.paused_at).getTime();

  // Shift pending schedules forward by the pause duration so nothing
  // immediately fires after a long pause.
  const pending = await db.schedule.findMany({
    where: { flowId: id, status: "pending" },
    select: { id: true, scheduledFor: true },
  });
  await Promise.all(pending.map(s =>
    db.schedule.update({
      where: { id: s.id },
      data: { scheduledFor: new Date(s.scheduledFor.getTime() + pauseMs) },
    }),
  ));

  settings.lifecycle.status = "active";
  settings.lifecycle.paused_at = null;
  await db.flow.update({ where: { id }, data: { flowSettings: JSON.stringify(settings) } });
  revalidatePath(`/flows/${id}`);
}

// ---------------------------------------------------------------------------
// Add cards mid-flight
// ---------------------------------------------------------------------------

export async function previewAddSchedule(count: number, startDate: string, endDate: string) {
  const start = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days < 1) throw new Error("End date must be on or after start date");
  if (days > 366) throw new Error("Date range is too long (max 366 days)");
  if (count <= 0) throw new Error("Add at least 1 card");
  const counts = randomDailyCounts(count, days);
  return counts.map((c, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().substring(0, 10), count: c };
  });
}

export type AddCardsInput = {
  flowId: string;
  /** Per-product mix the user picked for THIS batch — same shape as create flow. */
  productMix: Array<{ product_id: string; product_name: string; price: number; count: number }>;
  perDay: { date: string; count: number }[];
};

/** Append more schedules to an existing flow.
 *  - Pulls cards from the pool, creates Schedule rows with fire_plan snapshots.
 *  - Updates flow_settings: extends window.end_date if needed, merges
 *    cc_products counts, bumps total_cards.
 *  - If flow was "completed", flips lifecycle.status back to "active".
 *    Refuses to add while the flow is "paused" (pause it explicitly first). */
export async function addCardsToFlow(input: AddCardsInput) {
  const flow = await db.flow.findUnique({
    where: { id: input.flowId },
  });
  if (!flow) throw new Error("Flow not found");
  const settings = parseFlowSettings(flow.flowSettings);
  if (settings.lifecycle.status === "paused") {
    throw new Error("Resume the flow before adding cards");
  }

  const totalToAdd = input.productMix.reduce((s, p) => s + p.count, 0);
  if (totalToAdd <= 0) throw new Error("Pick at least one card");

  const today = calendarDateBkk(nowBkk());
  for (const d of input.perDay) {
    if (d.date < today) throw new Error(`Cannot add cards to a past day (${d.date})`);
  }
  const perDaySum = input.perDay.reduce((s, d) => s + d.count, 0);
  if (perDaySum !== totalToAdd) {
    throw new Error(`Per-day schedule sums to ${perDaySum} but mix sums to ${totalToAdd}`);
  }

  const cards = flowCardSource(settings) === "unlim"
    ? await pullUnlimForFlow(totalToAdd, input.flowId)
    : await pullTopupFromPool(totalToAdd);
  if (cards.length < totalToAdd) {
    const kind = flowCardSource(settings) === "unlim" ? "unlimited (not already in this flow)" : "pool";
    throw new Error(`Only ${cards.length} ${kind} cards available — need ${totalToAdd}`);
  }

  // Shuffled (card, plan) sequence — same logic as createFlow.
  const planSequence: FirePlan[] = [];
  for (const p of input.productMix) {
    for (let i = 0; i < p.count; i++) {
      planSequence.push({
        product_id: p.product_id,
        product_name: p.product_name,
        price: p.price,
        cc_gateway_id: settings.cc_gateway.id,
      });
    }
  }
  for (let i = planSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [planSequence[i], planSequence[j]] = [planSequence[j], planSequence[i]];
  }

  const sortedDays = [...input.perDay].sort((a, b) => a.date.localeCompare(b.date));
  const floor = new Date(nowBkk().getTime() + 60_000);
  let cardIdx = 0;
  for (const day of sortedDays) {
    if (day.count <= 0) continue;
    const dayDate = new Date(day.date + "T12:00:00.000Z");
    const times = stratifiedTimesForDay(day.count, dayDate, floor);
    if (times.length < day.count) {
      throw new Error(`Not enough time left today (${day.date}) to schedule ${day.count} cards — pick a later start date or fewer cards`);
    }
    for (let i = 0; i < day.count; i++) {
      const card = cards[cardIdx];
      const plan = planSequence[cardIdx];
      cardIdx++;
      await db.schedule.create({
        data: {
          flowId: input.flowId,
          cardId: card.id,
          scheduledFor: times[i],
          firePlan: JSON.stringify(plan),
          createdAt: nowBkk(),
        },
      });
    }
  }

  // Merge cc_products (same product_id adds count, new product_id appends).
  const merged: CCProduct[] = [...settings.cc_products];
  for (const p of input.productMix) {
    const existing = merged.find(m => m.id === p.product_id);
    if (existing) {
      existing.count += p.count;
      existing.price = p.price; // pick up any price override from the form
    } else {
      merged.push({ id: p.product_id, name: p.product_name, price: p.price, count: p.count });
    }
  }

  const lastDay = sortedDays[sortedDays.length - 1].date;
  const newEndDateIso = new Date(lastDay + "T06:00:00.000Z").toISOString();
  if (new Date(newEndDateIso) > new Date(settings.schedule_window.end_date)) {
    settings.schedule_window.end_date = newEndDateIso;
  }
  settings.cc_products = merged;
  settings.total_cards = settings.total_cards + totalToAdd;
  // Reopen if previously completed — adding cards means we keep running.
  if (settings.lifecycle.status === "completed") settings.lifecycle.status = "active";

  await db.flow.update({
    where: { id: input.flowId },
    data: { flowSettings: JSON.stringify(settings) },
  });

  revalidatePath(`/flows/${input.flowId}`);
}

// ---------------------------------------------------------------------------
// Per-schedule edit + delete (pending only)
// ---------------------------------------------------------------------------

/** Update a pending schedule's time and/or fire_plan (product/price). Refuses
 *  if status !== pending. If product_id changes to one not in the flow's mix,
 *  the mix gets a new entry; the old product's count is decremented. */
export async function updateSchedule(
  scheduleId: string,
  patch: { scheduledForIso?: string; productId?: string; price?: number; ccGatewayId?: string },
) {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { flow: true },
  });
  if (!schedule) throw new Error("Schedule not found");
  if (schedule.status !== "pending") {
    throw new Error(`Cannot edit a ${schedule.status} schedule`);
  }

  const oldPlan = parseFirePlan(schedule.firePlan);
  const settings = parseFlowSettings(schedule.flow.flowSettings);

  const data: { scheduledFor?: Date; firePlan?: string } = {};

  if (patch.scheduledForIso) {
    const newTime = new Date(patch.scheduledForIso);
    if (Number.isNaN(newTime.getTime())) throw new Error("Invalid time");
    data.scheduledFor = newTime;
  }

  let newPlan = oldPlan;
  let productChanged = false;
  if (patch.productId && patch.productId !== oldPlan.product_id) {
    const product = settings.cc_products.find(p => p.id === patch.productId);
    if (!product) throw new Error(`Product ${patch.productId} not in this flow`);
    newPlan = { ...newPlan, product_id: product.id, product_name: product.name };
    productChanged = true;
  }
  if (patch.price !== undefined && patch.price !== oldPlan.price) {
    if (patch.price < 0) throw new Error("Price must be ≥ 0");
    newPlan = { ...newPlan, price: patch.price };
  }
  if (patch.ccGatewayId && patch.ccGatewayId !== oldPlan.cc_gateway_id) {
    if (!patch.ccGatewayId.trim()) throw new Error("Gateway (MID) is required");
    newPlan = { ...newPlan, cc_gateway_id: patch.ccGatewayId };
  }
  if (newPlan !== oldPlan) {
    data.firePlan = JSON.stringify(newPlan);
  }

  if (Object.keys(data).length === 0) return;

  await db.schedule.update({ where: { id: scheduleId }, data });

  // If the product changed, update flow_settings.cc_products counts.
  if (productChanged) {
    const oldEntry = settings.cc_products.find(p => p.id === oldPlan.product_id);
    if (oldEntry) oldEntry.count = Math.max(0, oldEntry.count - 1);
    settings.cc_products = settings.cc_products.filter(p => p.count > 0);
    const newEntry = settings.cc_products.find(p => p.id === newPlan.product_id);
    if (newEntry) newEntry.count += 1;
    else settings.cc_products.push({ id: newPlan.product_id, name: newPlan.product_name, price: newPlan.price, count: 1 });
    await db.flow.update({
      where: { id: schedule.flow.id },
      data: { flowSettings: JSON.stringify(settings) },
    });
  }

  revalidatePath(`/flows/${schedule.flow.id}`);
}

/** Delete a pending schedule, returning the card to the pool. Refuses if the
 *  schedule has fired or is processing. Decrements flow.total_cards and the
 *  matching cc_products entry. If this was the last pending/processing
 *  schedule and the flow has fired schedules, flips lifecycle to completed. */
export async function deleteSchedule(scheduleId: string) {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { flow: true },
  });
  if (!schedule) throw new Error("Schedule not found");
  if (schedule.status !== "pending") {
    throw new Error(`Cannot delete a ${schedule.status} schedule`);
  }

  const plan = parseFirePlan(schedule.firePlan);
  const settings = parseFlowSettings(schedule.flow.flowSettings);

  await db.schedule.delete({ where: { id: scheduleId } });

  // Decrement cc_products and total_cards.
  const entry = settings.cc_products.find(p => p.id === plan.product_id);
  if (entry) entry.count = Math.max(0, entry.count - 1);
  settings.cc_products = settings.cc_products.filter(p => p.count > 0);
  settings.total_cards = Math.max(0, settings.total_cards - 1);

  // Auto-complete the flow if nothing is left to fire.
  const remaining = await db.schedule.count({
    where: {
      flowId: schedule.flow.id,
      OR: [{ status: "pending" }, { status: "processing" }],
    },
  });
  const hasFired = await db.schedule.count({
    where: { flowId: schedule.flow.id, status: "fired" },
  });
  if (remaining === 0 && hasFired > 0 && settings.lifecycle.status === "active") {
    settings.lifecycle.status = "completed";
  }

  await db.flow.update({
    where: { id: schedule.flow.id },
    data: { flowSettings: JSON.stringify(settings) },
  });

  revalidatePath(`/flows/${schedule.flow.id}`);
}

// ---------------------------------------------------------------------------
// Flow-level edit + delete
// ---------------------------------------------------------------------------

/** Edit safe-to-change fields on a flow. Name is always editable. Window end
 *  can move forward or shrink (refused if any pending schedule sits past the
 *  new end). Routing (gateway/campaign/products) is intentionally NOT here —
 *  if you want different routing, delete the flow (only allowed when fresh)
 *  and duplicate again. */
export async function updateFlow(
  flowId: string,
  patch: { name?: string; scheduleWindowEnd?: string },
) {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error("Flow not found");

  const settings = parseFlowSettings(flow.flowSettings);
  const data: { name?: string; flowSettings?: string } = {};

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error("Name can't be empty");
    data.name = name;
  }

  if (patch.scheduleWindowEnd) {
    const newEndIso = new Date(patch.scheduleWindowEnd + "T06:00:00.000Z").toISOString();
    const pendingPastEnd = await db.schedule.count({
      where: { flowId, status: "pending", scheduledFor: { gt: new Date(newEndIso) } },
    });
    if (pendingPastEnd > 0) {
      throw new Error(
        `${pendingPastEnd} pending schedule${pendingPastEnd === 1 ? "" : "s"} sit past the new end date — move or delete them first.`,
      );
    }
    settings.schedule_window.end_date = newEndIso;
    data.flowSettings = JSON.stringify(settings);
  }

  if (Object.keys(data).length === 0) return;

  await db.flow.update({ where: { id: flowId }, data });
  revalidatePath(`/flows/${flowId}`);
  revalidatePath("/flows");
}

/** Delete an entire flow. Only succeeds when the flow is "fresh" — no schedule
 *  has fired or is in flight. Pending schedules are removed; their cards
 *  return to the pool automatically. */
export async function deleteFlow(flowId: string) {
  if (!(await flowIsFresh(flowId))) {
    throw new Error("Can't delete a flow once any schedule has fired — fire history is permanent.");
  }
  await db.schedule.deleteMany({ where: { flowId } });
  await db.flow.delete({ where: { id: flowId } });

  revalidatePath("/flows");
  redirect("/flows");
}

// ---------------------------------------------------------------------------
// Add / remove products on a flow
// ---------------------------------------------------------------------------

/** Fetch the CC campaign's full product list and mark which are already on
 *  this flow. Used by EditFlowModal's "Add product" picker. */
export async function fetchAvailableProducts(flowId: string): Promise<{
  id: string; name: string; price: number; alreadyInFlow: boolean;
}[]> {
  const flow = await db.flow.findUnique({
    where: { id: flowId },
    include: { account: true },
  });
  if (!flow) throw new Error("Flow not found");

  const settings = parseFlowSettings(flow.flowSettings);
  const catalog = await listCCProducts(
    {
      apiUrl: flow.account.apiUrl,
      loginId: flow.account.loginIdEncrypted,
      password: flow.account.passwordEncrypted,
    },
    settings.cc_campaign.id,
  );

  const inFlow = new Set(settings.cc_products.map(p => p.id));
  return catalog.map(p => ({ ...p, alreadyInFlow: inFlow.has(p.id) }));
}

/** Add a CC product to the flow's product list with count=0. Adding a product
 *  doesn't schedule any cards — the user does that via Add Cards next. */
export async function addProductToFlow(
  flowId: string,
  product: { id: string; name: string; price: number },
) {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error("Flow not found");

  const settings = parseFlowSettings(flow.flowSettings);
  if (settings.cc_products.find(p => p.id === product.id)) {
    throw new Error("That product is already in this flow");
  }
  if (product.price < 0) throw new Error("Price must be ≥ 0");

  settings.cc_products.push({
    id: product.id,
    name: product.name,
    price: product.price,
    count: 0,
  });

  await db.flow.update({
    where: { id: flowId },
    data: { flowSettings: JSON.stringify(settings) },
  });
  revalidatePath(`/flows/${flowId}`);
}

/** Remove a CC product from the flow. Only allowed when no schedule still
 *  references it (count === 0 AND no fire_plan in any schedule mentions it). */
export async function deleteProductFromFlow(flowId: string, productId: string) {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error("Flow not found");

  const settings = parseFlowSettings(flow.flowSettings);
  const entry = settings.cc_products.find(p => p.id === productId);
  if (!entry) throw new Error("Product not in this flow");

  if (entry.count > 0) {
    throw new Error(
      `${entry.count} schedule${entry.count === 1 ? "" : "s"} still use${entry.count === 1 ? "s" : ""} this product — delete those first.`,
    );
  }

  // Defensive check: confirm no fire_plan in any schedule references this product_id.
  // (Catches drift between the counter and reality — e.g. if a fire_plan was
  // edited via updateSchedule and the count wasn't decremented for some reason.)
  const lingering = await db.schedule.count({
    where: { flowId, firePlan: { contains: `"product_id":"${productId}"` } },
  });
  if (lingering > 0) {
    throw new Error(`${lingering} schedule(s) still reference this product_id — refusing for safety.`);
  }

  settings.cc_products = settings.cc_products.filter(p => p.id !== productId);
  await db.flow.update({
    where: { id: flowId },
    data: { flowSettings: JSON.stringify(settings) },
  });
  revalidatePath(`/flows/${flowId}`);
}

/** Re-pull the CC campaign and sync product name + price onto the flow's stored
 *  cc_products — for when the campaign is edited in CheckoutChamp (e.g. a price
 *  change) after the flow was built. Matches by product id: updates existing
 *  entries in place (count untouched) and appends products newly added to the
 *  campaign with count 0. Products no longer on the campaign are LEFT ALONE —
 *  they may still be referenced by schedules; removal stays the guarded manual
 *  action (deleteProductFromFlow). Returns the fresh list so an open dialog can
 *  reflect it without a reload. */
export async function refreshFlowProducts(flowId: string): Promise<CCProduct[]> {
  const flow = await db.flow.findUnique({
    where: { id: flowId },
    include: { account: true },
  });
  if (!flow) throw new Error("Flow not found");

  const settings = parseFlowSettings(flow.flowSettings);
  const catalog = await listCCProducts(
    {
      apiUrl: flow.account.apiUrl,
      loginId: flow.account.loginIdEncrypted,
      password: flow.account.passwordEncrypted,
    },
    settings.cc_campaign.id,
  );

  for (const fresh of catalog) {
    const existing = settings.cc_products.find(p => p.id === fresh.id);
    if (existing) {
      existing.name = fresh.name;
      existing.price = fresh.price;
    } else {
      settings.cc_products.push({ id: fresh.id, name: fresh.name, price: fresh.price, count: 0 });
    }
  }

  await db.flow.update({
    where: { id: flowId },
    data: { flowSettings: JSON.stringify(settings) },
  });
  revalidatePath(`/flows/${flowId}`);
  return settings.cc_products;
}

/** Retry a failed fire by rescheduling it. Refuses unless the schedule is
 *  `status='fired'` AND `success=false`. Resets it to `pending`, sets a new
 *  `scheduledFor`, clears `firedAt` / `orderId` / `success`, but PRESERVES
 *  `fire_attempts` (history is append-only). If the flow was marked
 *  `completed`, it flips back to `active`. */
export async function retryFailedSchedule(scheduleId: string, newScheduledForIso: string) {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { flow: true },
  });
  if (!schedule) throw new Error("Schedule not found");
  if (schedule.status !== "fired") {
    throw new Error(`Cannot retry a ${schedule.status} schedule`);
  }
  if (schedule.success) {
    throw new Error("Cannot retry a successful fire — it already worked");
  }

  const newTime = new Date(newScheduledForIso);
  if (Number.isNaN(newTime.getTime())) throw new Error("Invalid time");
  // Allow scheduling for a past instant too — cron will pick it up as overdue.
  // But require at least 30 seconds in the future to avoid race with current tick.
  if (newTime.getTime() < nowBkk().getTime() - 60_000) {
    throw new Error("Pick a time within the last minute or in the future");
  }

  await db.schedule.update({
    where: { id: scheduleId },
    data: {
      status: "pending",
      scheduledFor: newTime,
      firedAt: null,
      orderId: null,
      success: false,
      // fireAttempts intentionally untouched — preserves the failed attempt
    },
  });

  // Reopen the flow if it was marked completed.
  const settings = parseFlowSettings(schedule.flow.flowSettings);
  if (settings.lifecycle.status === "completed") {
    settings.lifecycle.status = "active";
    await db.flow.update({
      where: { id: schedule.flow.id },
      data: { flowSettings: JSON.stringify(settings) },
    });
  }

  revalidatePath(`/flows/${schedule.flow.id}`);
  revalidatePath("/cards");
  revalidatePath("/activity");
}

/** Fetch the CC account's enabled gateways for the schedule's flow.
 *  Used by the PendingScheduleModal "Where" picker. */
export async function fetchAvailableGatewaysForSchedule(
  scheduleId: string,
): Promise<{ id: string; title: string }[]> {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { flow: { include: { account: true } } },
  });
  if (!schedule) throw new Error("Schedule not found");

  const gateways = await listGateways({
    apiUrl: schedule.flow.account.apiUrl,
    loginId: schedule.flow.account.loginIdEncrypted,
    password: schedule.flow.account.passwordEncrypted,
  });
  return gateways.filter(g => g.enabled).map(g => ({ id: g.id, title: g.title }));
}

