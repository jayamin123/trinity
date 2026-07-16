import { Box, Typography, Alert, Card, CardContent } from "@mui/material";
import { db } from "@/lib/db";
import { countAvailableForFlow } from "@/lib/cards";
import { parseFlowSettings } from "@/lib/flows";
import NewFlowForm, { type FlowSource } from "./NewFlowForm";

export default async function NewFlowPage() {
  const [account, existingFlows, availableCount] = await Promise.all([
    db.account.findFirst(),
    db.flow.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    countAvailableForFlow(),
  ]);

  // Existing flows act as the "preset library" — pick one, tweak, submit.
  // Each flow already carries cc_gateway + cc_campaign + cc_products in its
  // flow_settings JSON, so it's a perfect source for the next one.
  const sources: FlowSource[] = existingFlows.map(f => {
    const s = parseFlowSettings(f.flowSettings);
    return {
      flowId: f.id,
      flowName: f.name,
      ccGateway: s.cc_gateway,
      ccCampaign: s.cc_campaign,
      ccProducts: s.cc_products,
    };
  });

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h4" gutterBottom>New flow</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a gateway, campaign, and products — or duplicate a previous flow to prefill them — then tweak for this run. The cron starts firing as soon as the flow is created.
      </Typography>

      {!account && <Alert severity="warning" sx={{ mb: 2 }}>Add CheckoutChamp credentials in Settings first.</Alert>}
      {availableCount === 0 && <Alert severity="warning" sx={{ mb: 2 }}>No cards available — upload a CSV first.</Alert>}

      <Card>
        <CardContent>
          <NewFlowForm sources={sources} availableCount={availableCount} />
        </CardContent>
      </Card>
    </Box>
  );
}
