import { Card, CardContent, TextField, Button, Typography, Box, Alert } from "@mui/material";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "var(--app-panel2)" }}>
      <Card sx={{ width: 400, p: 1 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>Trinity</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Sign in to continue</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form action={login}>
            <TextField name="email" label="Email" type="email" fullWidth required margin="normal" autoFocus />
            <TextField name="password" label="Password" type="password" fullWidth required margin="normal" />
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }}>Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
