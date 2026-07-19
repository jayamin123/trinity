import { Box, Card, CardContent, Typography, Grid, Stack, Chip, LinearProgress, Button } from "@mui/material";
import { db } from "@/lib/db";
import { POOL_WHERE } from "@/lib/cards";
import { parseFlowSettings, parseFirePlan } from "@/lib/flows";
import { startOfTodayBkk, formatBkk, nowBkk } from "@/lib/bkk";
import Link from "next/link";

type Range = "today" | "7d" | "30d" | "all";
type GroupBy = "flow" | "price";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; groupBy?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = (["today", "7d", "30d", "all"] as const).includes(sp.range as Range)
    ? (sp.range as Range) : "all";
  const groupBy: GroupBy = sp.groupBy === "price" ? "price" : "flow";
  const since = startOfTodayBkk();

  // Date filter for the Totals card. Filters schedules by `scheduledFor`.
  let totalsScheduledForGte: Date | undefined;
  const nowMs = nowBkk().getTime();
  if (range === "today") totalsScheduledForGte = since;
  else if (range === "7d") totalsScheduledForGte = new Date(nowMs - 7 * 86_400_000);
  else if (range === "30d") totalsScheduledForGte = new Date(nowMs - 30 * 86_400_000);
  const endOfToday = new Date(since.getTime() + 24 * 60 * 60 * 1000);

  const [
    account,
    poolCount, totalCards,
    todayFired, todaySuccess, todayFailed, todayScheduled,
    flows,
    recent,
  ] = await Promise.all([
    db.account.findFirst(),
    db.card.count({ where: POOL_WHERE }),
    db.card.count(),
    db.schedule.count({ where: { firedAt: { gte: since } } }),
    db.schedule.count({ where: { firedAt: { gte: since }, success: true } }),
    db.schedule.count({ where: { firedAt: { gte: since }, success: false, status: "fired" } }),
    // Cards still pending whose scheduled_for falls anywhere in today (BKK).
    // Includes overdue items that haven't fired yet — they should still count
    // for "today's load".
    db.schedule.count({
      where: {
        status: "pending",
        scheduledFor: { gte: since, lt: endOfToday },
      },
    }),
    db.flow.findMany({ orderBy: { createdAt: "desc" } }),
    db.schedule.findMany({
      where: { status: "fired" },
      orderBy: { firedAt: "desc" },
      take: 10,
      include: {
        card: { select: { panLast4: true } },
        flow: { select: { name: true } },
      },
    }),
  ]);

  // ---------- Totals card data ----------
  // Fetch all schedules in the date window, with flow info, then aggregate in JS.
  // Cheaper than 3 GROUP BY round-trips and gives us per-group MID for free.
  const totalsSchedules = await db.schedule.findMany({
    where: totalsScheduledForGte ? { scheduledFor: { gte: totalsScheduledForGte } } : {},
    select: {
      status: true,
      success: true,
      firePlan: true,
      flow: { select: { id: true, name: true, flowSettings: true } },
    },
  });

  let tPlanned = 0, tSuccess = 0, tFailed = 0;
  type TotalsRow = { key: string; label: string; mid: string | null; planned: number; success: number; failed: number };
  const byKey = new Map<string, TotalsRow>();

  for (const s of totalsSchedules) {
    const plan = parseFirePlan(s.firePlan);
    const isFired = s.status === "fired";
    const isSuccess = isFired && s.success;
    const isFailed = isFired && !s.success;

    tPlanned++;
    if (isSuccess) tSuccess++;
    if (isFailed) tFailed++;

    let key: string;
    let label: string;
    let mid: string | null;
    if (groupBy === "price") {
      key = plan.price.toFixed(2);
      label = `$${key}`;
      mid = null;
    } else {
      key = s.flow.id;
      label = s.flow.name;
      try { mid = parseFlowSettings(s.flow.flowSettings).cc_gateway.id; }
      catch { mid = null; }
    }

    let row = byKey.get(key);
    if (!row) { row = { key, label, mid, planned: 0, success: 0, failed: 0 }; byKey.set(key, row); }
    row.planned++;
    if (isSuccess) row.success++;
    if (isFailed) row.failed++;
  }
  const totalsRows = [...byKey.values()].sort((a, b) => b.planned - a.planned);

  // Pre-build the URL params for the toggle links so they preserve the other dimension.
  const rangeHref = (r: Range) => `?range=${r}&groupBy=${groupBy}`;
  const groupByHref = (g: GroupBy) => `?range=${range}&groupBy=${g}`;

  // Filter flows whose lifecycle.status === active (lives inside flow_settings JSON).
  const activeFlows = flows.filter(f => {
    try { return parseFlowSettings(f.flowSettings).lifecycle.status === "active"; }
    catch { return false; }
  });

  const flowProgress = await Promise.all(
    activeFlows.map(async f => {
      const settings = parseFlowSettings(f.flowSettings);
      const done = await db.schedule.count({ where: { flowId: f.id, status: "fired" } });
      return { id: f.id, name: f.name, done, total: settings.total_cards };
    }),
  );

  // "Get started" only shows until the user has at least one flow ever
  // (even if it's now completed) — having created a flow means setup is done.
  const isFirstTime = !account || totalCards === 0 || flows.length === 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

      {isFirstTime && (
        <Card sx={{ mb: 3, bgcolor: "var(--app-accent-soft)", border: 1, borderColor: "var(--app-accent)" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Get started</Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: account ? "success.main" : "primary.main", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{account ? "✓" : "1"}</Box>
                <Typography>Add CheckoutChamp credentials</Typography>
                {!account && <Button size="small" href="/settings">Open settings</Button>}
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: totalCards > 0 ? "success.main" : "primary.main", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{totalCards > 0 ? "✓" : "2"}</Box>
                <Typography>Upload a CSV of cards</Typography>
                {totalCards === 0 && account && <Button size="small" href="/cards">Upload</Button>}
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: activeFlows.length > 0 ? "success.main" : "primary.main", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{activeFlows.length > 0 ? "✓" : "3"}</Box>
                <Typography>Create your first flow</Typography>
                {activeFlows.length === 0 && totalCards > 0 && account && <Button size="small" href="/flows/new">New flow</Button>}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <StatCard title="Cards in pool" value={poolCount.toLocaleString()} />
        <StatCard title="Today: still to fire" value={todayScheduled.toLocaleString()} color="warning.main" />
        <StatCard title="Today: fired" value={todayFired.toLocaleString()} />
        <StatCard title="Today: succeeded" value={todaySuccess.toLocaleString()} color="success.main" />
        <StatCard title="Today: failed" value={todayFailed.toLocaleString()} color="error.main" />
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active flows</Typography>
              {flowProgress.length === 0 ? (
                <Typography color="text.secondary">No active flows.</Typography>
              ) : (
                <Stack spacing={2}>
                  {flowProgress.map(f => {
                    const pct = f.total > 0 ? Math.round((f.done / f.total) * 100) : 0;
                    return (
                      <Box key={f.id}>
                        <Stack direction="row" justifyContent="space-between">
                          <Link href={`/flows/${f.id}`} style={{ textDecoration: "none" }}>
                            <Typography variant="body2" sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}>{f.name}</Typography>
                          </Link>
                          <Typography variant="body2" color="text.secondary">{f.done}/{f.total}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.5, height: 6, borderRadius: 0.5 }} />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent activity</Typography>
              {recent.length === 0 ? (
                <Typography color="text.secondary">No fires yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {recent.map(s => (
                    <Stack key={s.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={s.success ? "✓" : "✗"} size="small" color={s.success ? "success" : "error"} />
                        <Typography variant="body2">•••• {s.card.panLast4}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.flow.name}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{s.firedAt ? formatBkk(s.firedAt, "h:mm A") : ""}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" sx={{ mb: 1.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Totals</Typography>
                <Stack direction="row" spacing={0.25}>
                  {(["today", "7d", "30d", "all"] as const).map(r => (
                    <Button
                      key={r} component={Link} href={rangeHref(r)} size="small"
                      variant={range === r ? "contained" : "text"}
                      sx={{ minWidth: 0, px: 0.9, py: 0.1, textTransform: "none", fontSize: 11, lineHeight: 1.5 }}
                    >
                      {r === "today" ? "Today" : r === "7d" ? "7d" : r === "30d" ? "30d" : "All time"}
                    </Button>
                  ))}
                </Stack>
              </Stack>

              <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, lineHeight: 1 }}>Planned</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: "1.15rem", lineHeight: 1.3 }}>{tPlanned.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, lineHeight: 1 }}>Success</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: "1.15rem", lineHeight: 1.3, color: "success.main" }}>{tSuccess.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, lineHeight: 1 }}>Failed</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: "1.15rem", lineHeight: 1.3, color: "error.main" }}>{tFailed.toLocaleString()}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>By</Typography>
                {(["flow", "price"] as const).map(g => (
                  <Button
                    key={g} component={Link} href={groupByHref(g)} size="small"
                    variant={groupBy === g ? "contained" : "text"}
                    sx={{ minWidth: 0, px: 0.9, py: 0.1, textTransform: "none", fontSize: 11, lineHeight: 1.5 }}
                  >
                    {g === "flow" ? "Flow" : "Price"}
                  </Button>
                ))}
              </Stack>

              {totalsRows.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No schedules in this window.</Typography>
              ) : (
                <Box>
                  <Stack direction="row" sx={{ py: 0.4, borderBottom: 1, borderColor: "divider" }}>
                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ width: 52, textAlign: "right" }}><Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Plan</Typography></Box>
                    <Box sx={{ width: 52, textAlign: "right" }}><Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>✓</Typography></Box>
                    <Box sx={{ width: 52, textAlign: "right" }}><Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>✗</Typography></Box>
                  </Stack>
                  {totalsRows.map(r => (
                    <Stack key={r.key} direction="row" alignItems="center" sx={{ py: 0.5, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.label}
                          {r.mid && <span style={{ color: "var(--app-faint)", marginLeft: 6, fontSize: 11 }}>MID {r.mid}</span>}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 52, textAlign: "right" }}><Typography variant="body2" sx={{ fontSize: 13 }}>{r.planned}</Typography></Box>
                      <Box sx={{ width: 52, textAlign: "right" }}><Typography variant="body2" sx={{ fontSize: 13, color: r.success > 0 ? "success.main" : "text.disabled" }}>{r.success}</Typography></Box>
                      <Box sx={{ width: 52, textAlign: "right" }}><Typography variant="body2" sx={{ fontSize: 13, color: r.failed > 0 ? "error.main" : "text.disabled" }}>{r.failed}</Typography></Box>
                    </Stack>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <Grid item xs={12} sm={6} md={4} lg={2.4}>
      <Card>
        <CardContent>
          <Typography color="text.secondary" variant="caption">{title}</Typography>
          <Typography variant="h4" sx={{ color }}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
