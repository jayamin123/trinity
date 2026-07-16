import { Box, Typography, Alert, Stack, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { db } from "@/lib/db";
import { parseFireAttempts, parseFirePlan } from "@/lib/flows";
import { cardBalance, scheduleConsumesBalance } from "@/lib/balance";
import CardsTable, { type CardRow, type CardCounts, type Status, type CCVerdict } from "./CardsTable";
import UploadForm from "./UploadForm";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; imported?: string; matched?: string; skipped?: string }>;
}) {
  const { uploaded, imported, matched, skipped } = await searchParams;

  // Load cards and their schedules in TWO flat queries, then join in JS.
  // A nested `include` emits `... WHERE cardId IN (<every card id>)`, which blows
  // past D1's SQL-variable limit once the pool has a few hundred cards
  // ("D1_ERROR: too many SQL variables"). Two flat queries have no such fan-out.
  const [cards, allSchedules] = await Promise.all([
    db.card.findMany({ orderBy: { createdAt: "desc" } }),
    db.schedule.findMany({
      select: {
        id: true, cardId: true, status: true, success: true,
        firedAt: true, scheduledFor: true, fireAttempts: true, firePlan: true,
        flow: { select: { name: true } },
      },
      orderBy: { scheduledFor: "desc" },
    }),
  ]);

  const schedulesByCard = new Map<string, typeof allSchedules>();
  for (const s of allSchedules) {
    let arr = schedulesByCard.get(s.cardId);
    if (!arr) { arr = []; schedulesByCard.set(s.cardId, arr); }
    arr.push(s);
  }

  const rows: CardRow[] = cards.map(c => {
    const data = JSON.parse(c.cardData);
    const name = `${data.cardholder?.first_name ?? ""} ${data.cardholder?.last_name ?? ""}`.trim() || "—";
    const sourceFile = data.source_file ?? "";
    const amount = (data.amount ?? null) as CardRow["amount"];

    const schedules = schedulesByCard.get(c.id) ?? [];

    // Balance consumed = sum of live charge prices (pending/processing/succeeded).
    const committed = schedules.reduce((sum, s) => {
      if (!scheduleConsumesBalance(s.status, s.success)) return sum;
      const price = parseFirePlan(s.firePlan).price;
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
    const { overBalance } = cardBalance(amount, committed);

    // Most recent FIRED schedule (status === 'fired').
    const firedSchedules = schedules.filter(s => s.status === "fired");
    const mostRecentFired = firedSchedules
      .slice()
      .sort((a, b) => {
        const aT = a.firedAt ? a.firedAt.getTime() : 0;
        const bT = b.firedAt ? b.firedAt.getTime() : 0;
        return bT - aT;
      })[0];

    // Soonest PENDING/PROCESSING schedule.
    const pendingSchedules = schedules.filter(s => s.status === "pending" || s.status === "processing");
    const soonestPending = pendingSchedules
      .slice()
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())[0];

    let status: Status;
    let firedAtIso: string | null = null;
    let scheduleId: string | null = null;
    let flowName: string | null = null;
    let ccVerdict: CCVerdict | null = null;
    let plannedMid: string | null = null;
    let actualMid: string | null = null;

    if (mostRecentFired) {
      status = "fired";
      firedAtIso = mostRecentFired.firedAt?.toISOString() ?? null;
      scheduleId = mostRecentFired.id;
      flowName = mostRecentFired.flow.name;

      const attempts = parseFireAttempts(mostRecentFired.fireAttempts);
      const last = attempts[attempts.length - 1];
      const success = last ? last.success : mostRecentFired.success;
      const cascade = last ? last.cascade_used : false;
      if (success && cascade) ccVerdict = "cascade";
      else if (success) ccVerdict = "success";
      else ccVerdict = "failed";

      const plan = parseFirePlan(mostRecentFired.firePlan);
      plannedMid = plan.cc_gateway_id;
      actualMid = last?.actual_cc_gateway_id ?? null;
    } else if (soonestPending) {
      status = "pending";
      scheduleId = soonestPending.id;
      flowName = soonestPending.flow.name;
    } else {
      status = "pool";
    }

    return {
      id: c.id,
      last4: c.panLast4,
      name,
      amount,
      committed,
      overBalance,
      source: sourceFile,
      status,
      firedAtIso,
      scheduleId,
      flowName,
      ccVerdict,
      plannedMid,
      actualMid,
    };
  });

  const counts: CardCounts = {
    all: rows.length,
    pool: rows.filter(r => r.status === "pool").length,
    pending: rows.filter(r => r.status === "pending").length,
    fired: rows.filter(r => r.status === "fired").length,
    success: rows.filter(r => r.ccVerdict === "success").length,
    failed: rows.filter(r => r.ccVerdict === "failed").length,
    cascade: rows.filter(r => r.ccVerdict === "cascade").length,
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3, minHeight: 64 }}>
        <Box>
          <Typography variant="h4">Cards</Typography>
          <Typography variant="body2" color="text.secondary">
            {counts.pool.toLocaleString()} in pool · {(counts.all - counts.pool).toLocaleString()} in use · {counts.all.toLocaleString()} total
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mb: 0.5 }}>
                Required CSV headers
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                Card Number · Security Code · Exp Month · Exp Year
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600 }}>
                Optional
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                First Name, Last Name, Address, City, State, Zip Code, Phone Number, Email Address, IP Address, Topup Amount
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 1, fontStyle: "italic" }}>
                Re-uploading the same card (same name + last 4 + expiry) merges onto the existing identity row.
              </Typography>
            </Box>
          } arrow>
            <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
          </Tooltip>
          <UploadForm />
        </Stack>
      </Stack>

      {uploaded && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Uploaded {uploaded}.
          {" "}{imported ?? "0"} new
          {matched && Number(matched) > 0 ? `, ${matched} matched existing` : ""}
          {skipped && Number(skipped) > 0 ? `, ${skipped} skipped` : ""}.
        </Alert>
      )}

      <CardsTable rows={rows} counts={counts} />
    </Box>
  );
}
