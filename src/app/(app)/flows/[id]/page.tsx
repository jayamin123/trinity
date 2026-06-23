import { notFound } from "next/navigation";
import { Box, Typography, Chip, Stack, Button } from "@mui/material";
import { db } from "@/lib/db";
import { parseFlowSettings, getFlowDayRollup } from "@/lib/flows";
import { countCardsInPool } from "@/lib/cards";
import { formatBkk, nowBkk } from "@/lib/bkk";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import FlowTabs from "./FlowTabs";
import PlanTab from "./PlanTab";
import ActivityTab from "./ActivityTab";
import AddCardsDialog from "./AddCardsDialog";
import EditFlowModal from "./EditFlowModal";
import { pauseFlow, resumeFlow } from "./actions";

const STATUS_COLOR: Record<string, "success" | "warning" | "default"> = {
  active: "success", paused: "warning", completed: "default",
};

export default async function FlowDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "plan" } = await searchParams;
  const activeTab = ["plan", "activity"].includes(tab) ? tab : "plan";

  const flow = await db.flow.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!flow) notFound();

  const settings = parseFlowSettings(flow.flowSettings);

  const [rollup, succeededCount, firedCount, scheduleRows, poolCount, lastScheduled, usedCount, pendingCount, processingCount, nextPending, lastFired] = await Promise.all([
    getFlowDayRollup(id),
    db.schedule.count({ where: { flowId: id, success: true } }),
    db.schedule.count({ where: { flowId: id, status: "fired" } }),
    activeTab === "activity"
      ? db.schedule.findMany({
          where: { flowId: id, status: "fired" },
          orderBy: { firedAt: "desc" },
          take: 300,
          include: { card: { select: { panLast4: true, cardData: true } } },
        })
      : Promise.resolve([]),
    countCardsInPool(),
    db.schedule.findFirst({
      where: { flowId: id },
      orderBy: { scheduledFor: "desc" },
      select: { scheduledFor: true },
    }),
    db.schedule.count({ where: { flowId: id, OR: [{ status: "fired" }, { status: "processing" }] } }),
    db.schedule.count({ where: { flowId: id, status: "pending" } }),
    db.schedule.count({ where: { flowId: id, status: "processing" } }),
    db.schedule.findFirst({
      where: { flowId: id, status: "pending" },
      orderBy: { scheduledFor: "asc" },
      select: { scheduledFor: true },
    }),
    db.schedule.findFirst({
      where: { flowId: id, status: "fired" },
      orderBy: { firedAt: "desc" },
      select: { firedAt: true },
    }),
  ]);
  const isFresh = usedCount === 0;
  const failedCount = firedCount - succeededCount;

  // Default the AddCardsDialog window to start day-after-last-scheduled, span
  // the same length the original flow used.
  const lastDate = lastScheduled?.scheduledFor ? dayjs.utc(lastScheduled.scheduledFor).add(1, "day") : dayjs.utc(nowBkk()).add(1, "day");
  const origSpanDays = Math.max(1, Math.ceil(
    (new Date(settings.schedule_window.end_date).getTime() - new Date(settings.schedule_window.start_date).getTime()) / (1000 * 60 * 60 * 24),
  ));
  const addDefaultStart = lastDate.format("YYYY-MM-DD");
  const addDefaultEnd = lastDate.add(origSpanDays - 1, "day").format("YYYY-MM-DD");

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4">{flow.name}</Typography>
            <Chip label={settings.lifecycle.status} color={STATUS_COLOR[settings.lifecycle.status] ?? "default"} />
            <EditFlowModal
              flowId={id}
              flowName={flow.name}
              settings={settings}
              isFresh={isFresh}
              createdAt={flow.createdAt.toISOString()}
              account={{ name: flow.account.name, apiUrl: flow.account.apiUrl }}
              progress={{
                total: settings.total_cards,
                fired: firedCount,
                succeeded: succeededCount,
                failed: failedCount,
                pending: pendingCount,
                processing: processingCount,
                nextPendingIso: nextPending?.scheduledFor.toISOString() ?? null,
                lastFiredIso: lastFired?.firedAt?.toISOString() ?? null,
              }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatBkk(new Date(settings.schedule_window.start_date), "MMM D")} – {formatBkk(new Date(settings.schedule_window.end_date), "MMM D")}
            {" · "}
            {settings.total_cards} cards
            {" · "}
            {settings.cc_campaign.name} ({settings.cc_gateway.name})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Product mix:{" "}
            {settings.cc_products.map(p => `${p.count}× ${p.name}`).join(", ")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {firedCount}/{settings.total_cards} fired · {succeededCount} succeeded
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {/* No Delete button — flows are permanent (fire history must be preserved). */}
          {settings.lifecycle.status !== "paused" && (
            <AddCardsDialog
              flowId={id}
              flowName={flow.name}
              availableProducts={settings.cc_products}
              poolCount={poolCount}
              defaultStart={addDefaultStart}
              defaultEnd={addDefaultEnd}
              currentMix={settings.cc_products.map(p => `${p.count}× ${p.name}`).join(", ")}
              gatewayId={settings.cc_gateway.id}
              campaignName={settings.cc_campaign.name}
            />
          )}
          {settings.lifecycle.status === "active" && (
            <form action={pauseFlow.bind(null, id)}>
              <Button type="submit" variant="outlined">Pause</Button>
            </form>
          )}
          {settings.lifecycle.status === "paused" && (
            <form action={resumeFlow.bind(null, id)}>
              <Button type="submit" variant="contained" color="success">Resume</Button>
            </form>
          )}
        </Stack>
      </Stack>

      <FlowTabs id={id} activeTab={activeTab} />

      {activeTab === "plan" && (
        <PlanTab
          rollup={rollup}
          availableProducts={settings.cc_products}
        />
      )}
      {activeTab === "activity" && (
        <ActivityTab
          schedules={scheduleRows.map(s => ({
            id: s.id,
            firedAt: s.firedAt?.toISOString() ?? null,
            scheduledFor: s.scheduledFor.toISOString(),
            orderId: s.orderId,
            success: s.success,
            cardLast4: s.card.panLast4,
            cardName: (() => {
              const d = JSON.parse(s.card.cardData);
              return `${d.cardholder?.first_name ?? ""} ${d.cardholder?.last_name ?? ""}`.trim();
            })(),
            firePlan: s.firePlan,
            fireAttempts: s.fireAttempts,
          }))}
        />
      )}
    </Box>
  );
}
