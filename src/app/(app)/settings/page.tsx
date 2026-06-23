import { Card, CardContent, TextField, Button, Typography, Box, Alert, Stack } from "@mui/material";
import { db } from "@/lib/db";
import { saveAccount } from "./actions";
import TestConnectionButton from "./TestConnectionButton";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const account = await db.account.findFirst();

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>

      <Stack spacing={2} sx={{ mb: 3 }}>
        {saved && <Alert severity="success">Account saved.</Alert>}
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>CheckoutChamp account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Credentials are encrypted before being saved. Gateway and campaign are now picked per-flow.
          </Typography>
          <form action={saveAccount}>
            <TextField name="name" label="Account name" defaultValue={account?.name ?? "Apollo"} fullWidth margin="normal" required />
            <TextField name="apiUrl" label="API URL" defaultValue={account?.apiUrl ?? "https://api.checkoutchamp.com"} fullWidth margin="normal" required />
            <TextField
              name="loginId"
              label={account ? "Login ID (leave blank to keep current)" : "Login ID"}
              fullWidth
              margin="normal"
              required={!account}
            />
            <TextField
              name="password"
              type="password"
              label={account ? "Password (leave blank to keep current)" : "Password"}
              fullWidth
              margin="normal"
              required={!account}
            />
            <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
              <Button type="submit" variant="contained">Save</Button>
            </Stack>
          </form>
          {account && (
            <Box sx={{ mt: 2 }}>
              <TestConnectionButton />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
