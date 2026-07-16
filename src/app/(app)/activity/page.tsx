import { Box, Typography } from "@mui/material";
import { db } from "@/lib/db";
import ActivityTable from "./ActivityTable";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { parseFirePlan, parseFireAttempts } from "@/lib/flows";
dayjs.extend(utc);

/** Actual product CheckoutChamp charged, pulled from the raw response. */
function actualProduct(rawStr: string): { name: string; id: string } | null {
  try {
    const obj = JSON.parse(rawStr);
    const msg = obj && typeof obj.message === "object" ? obj.message : obj;
    const item = msg?.items?.[0];
    if (!item) return null;
    return { name: String(item.name ?? "—"), id: String(item.actualProductId ?? item.productId ?? "—") };
  } catch {
    return null;
  }
}

export default async function ActivityPage() {
  const schedules = await db.schedule.findMany({
    where: { status: "fired" },
    orderBy: { firedAt: "desc" },
    take: 500,
    include: {
      card: { select: { panLast4: true } },
      flow: { select: { name: true } },
    },
  });

  const rows = schedules.map(s => {
    const plan = parseFirePlan(s.firePlan);
    const attempts = parseFireAttempts(s.fireAttempts);
    const last = attempts[attempts.length - 1];
    const actual = last ? actualProduct(last.cc_response.raw) : null;
    const paid = last?.amount_paid != null ? `$${last.amount_paid.toFixed(2)}` : "—";
    return {
      id: s.id,
      when: s.firedAt ? dayjs.utc(s.firedAt).format("MMM D, h:mm A") : "—",
      flow: s.flow.name,
      card: `•••• ${s.card.panLast4}`,
      planned: `${plan.product_name} · $${plan.price.toFixed(2)} · MID ${plan.cc_gateway_id}`,
      // Mirror the Planned format, with the ACTUAL product/price/MID that fired.
      executed: last
        ? `${actual ? actual.name + " · " : ""}${paid} · MID ${last.actual_cc_gateway_id ?? "—"}`
        : "—",
      executedProduct: actual?.name ?? "—",
      amountPaid: last?.amount_paid ?? null,
      actualMid: last?.actual_cc_gateway_id ?? null,
      cascade: last?.cascade_used ?? false,
      success: s.success,
      message: last?.cc_response.message ?? "—",
      orderId: s.orderId ?? "—",
    };
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Activity</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Every fired schedule across all flows (latest 500).
      </Typography>
      <ActivityTable rows={rows} />
    </Box>
  );
}
