import { Box, Card, CardContent, Typography, Button, Stack, Chip, LinearProgress, Alert } from "@mui/material";
import { db } from "@/lib/db";
import { parseFlowSettings } from "@/lib/flows";
import { formatBkk } from "@/lib/bkk";
import Link from "next/link";

const STATUS_COLOR: Record<string, "success" | "warning" | "default"> = {
  active: "success", paused: "warning", completed: "default",
};

export default async function FlowsPage() {
  const [account, flows] = await Promise.all([
    db.account.findFirst(),
    db.flow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { schedules: true } },
      },
    }),
  ]);

  const withCounts = await Promise.all(
    flows.map(async f => ({
      ...f,
      done: await db.schedule.count({ where: { flowId: f.id, status: "fired" } }),
      success: await db.schedule.count({ where: { flowId: f.id, success: true } }),
    })),
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Flows</Typography>
        <Button
          href={account ? "/flows/new" : "/settings"}
          variant="contained"
          size="large"
          disabled={!account}
        >
          + New flow
        </Button>
      </Stack>

      {!account && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Add CheckoutChamp credentials in <Link href="/settings">Settings</Link> before creating a flow.
        </Alert>
      )}

      {withCounts.length === 0 ? (
        <Card><CardContent>
          <Typography color="text.secondary">No flows yet. Upload cards and create your first flow.</Typography>
        </CardContent></Card>
      ) : (
        <Stack spacing={2}>
          {withCounts.map(f => {
            const settings = parseFlowSettings(f.flowSettings);
            const pct = settings.total_cards > 0 ? Math.round((f.done / settings.total_cards) * 100) : 0;
            const rate = f.done > 0 ? Math.round((f.success / f.done) * 100) : 0;
            return (
              <Card key={f.id} sx={{ cursor: "pointer", "&:hover": { boxShadow: 4 } }}>
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Link href={`/flows/${f.id}`} style={{ textDecoration: "none" }}>
                          <Typography variant="h6" sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                            {f.name}
                          </Typography>
                        </Link>
                        <Chip label={settings.lifecycle.status} size="small" color={STATUS_COLOR[settings.lifecycle.status] ?? "default"} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatBkk(new Date(settings.schedule_window.start_date), "MMM D")} – {formatBkk(new Date(settings.schedule_window.end_date), "MMM D")}
                        {" · "}
                        {settings.total_cards} cards
                        {" · "}
                        {settings.cc_campaign.name} (MID {settings.cc_gateway.id})
                        {" · "}
                        {settings.cc_products.map(p => `${p.count}× ${p.name}`).join(", ")}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="body2"><b>{f.done}</b> / {settings.total_cards} fired</Typography>
                          <Typography variant="body2" color="success.main"><b>{f.success}</b> succeeded</Typography>
                          {f.done > 0 && <Typography variant="body2" color="text.secondary">{rate}% success rate</Typography>}
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1 }} />
                      </Box>
                    </Box>
                    <Button href={`/flows/${f.id}`} size="small" sx={{ ml: 2 }}>View</Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
