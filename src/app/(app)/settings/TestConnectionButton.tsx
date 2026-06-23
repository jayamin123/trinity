"use client";
import { Button, Stack, Typography, CircularProgress } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useState } from "react";
import { testCcConnection } from "./actions";

export default function TestConnectionButton() {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; message: string }
    | { kind: "fail"; message: string }
  >({ kind: "idle" });

  async function handleClick() {
    setState({ kind: "loading" });
    try {
      const result = await testCcConnection();
      setState({ kind: result.ok ? "ok" : "fail", message: result.message });
    } catch (err) {
      setState({ kind: "fail", message: err instanceof Error ? err.message : "Test failed" });
    }
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Button type="button" onClick={handleClick} variant="outlined" disabled={state.kind === "loading"}>
        {state.kind === "loading" ? "Testing…" : "Test connection"}
      </Button>
      {state.kind === "loading" && <CircularProgress size={18} />}
      {state.kind === "ok" && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "success.main" }}>
          <CheckCircleOutlineIcon fontSize="small" />
          <Typography variant="body2">{state.message || "Connection OK"}</Typography>
        </Stack>
      )}
      {state.kind === "fail" && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "error.main" }}>
          <ErrorOutlineIcon fontSize="small" />
          <Typography variant="body2">{state.message}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
