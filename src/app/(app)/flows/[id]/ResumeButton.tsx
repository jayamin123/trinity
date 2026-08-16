"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Stack,
} from "@mui/material";
import { resumeFlow, resumeFlowPoolOverdue, resumeFlowRescheduleOverdue } from "./actions";

/** Resume button. When the flow has back-dated (overdue) pending cards, clicking
 *  Resume opens a dialog to decide what happens to them (rather than silently
 *  bursting them through or shifting every date). With no overdue cards it just
 *  turns the flow on. */
export default function ResumeButton({
  flowId, overdueCount,
}: {
  flowId: string;
  overdueCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (overdueCount === 0) {
    return (
      <form action={resumeFlow.bind(null, flowId)}>
        <Button type="submit" variant="contained" color="success">Resume</Button>
      </form>
    );
  }

  const noun = overdueCount === 1 ? "card is" : "cards are";
  const them = overdueCount === 1 ? "it" : "them";

  return (
    <>
      <Button variant="contained" color="success" onClick={() => setOpen(true)}>Resume</Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{overdueCount} {noun} overdue</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {overdueCount} scheduled {overdueCount === 1 ? "card is" : "cards are"} dated in the past.
            What should happen to {them} when the flow resumes? Cards dated in the future are left as-is.
          </DialogContentText>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Button
              disabled={busy} variant="outlined"
              onClick={() => run(() => resumeFlowRescheduleOverdue(flowId, "nextDay"))}
            >
              Start on the next available day (1/day)
            </Button>
            <Button
              disabled={busy} variant="outlined"
              onClick={() => run(() => resumeFlowRescheduleOverdue(flowId, "end"))}
            >
              Add them to the end of the flow
            </Button>
            <Button
              disabled={busy} variant="outlined" color="warning"
              onClick={() => run(() => resumeFlowPoolOverdue(flowId))}
            >
              Put them back in the pool
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
