"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, Stack,
  CircularProgress, IconButton, Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HistoryIcon from "@mui/icons-material/History";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getCardDetail, revealCardSecretsByCardId, type CardDetail, type ScheduleSummary } from "./card-detail-action";
import { InfoBar, SectionCard, Row, CardVisual } from "@/components/modal-shared";

// Lazy-load to break the circular import (these modals also reference CardModal).
const PendingScheduleModal = dynamic(() => import("../flows/[id]/PendingScheduleModal"), { ssr: false });
const FireAttemptsModal = dynamic(() => import("../flows/[id]/FireAttemptsModal"), { ssr: false });
dayjs.extend(utc);

export default function CardModal({
  open, cardId, onClose,
}: {
  open: boolean;
  cardId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null);
  const [firedScheduleId, setFiredScheduleId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !cardId) { setDetail(null); return; }
    setLoading(true);
    getCardDetail(cardId)
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [open, cardId]);

  if (!open) return null;

  // Determine title + pill from the card's overall state
  let title = "Card";
  let pillLabel = "";
  let pillColor: "success" | "warning" | "error" | "default" = "default";
  if (detail) {
    if (detail.schedules.length === 0) {
      title = "Pool Card";
      pillLabel = "Pool";
      pillColor = "default";
    } else {
      const firstPending = detail.schedules.find(s => s.status === "pending");
      const firstFired = detail.schedules.find(s => s.status === "fired");
      if (firstPending && !firstFired) {
        title = "Pending Card";
        pillLabel = "Pending";
        pillColor = "warning";
      } else if (firstFired) {
        // Use most recent fire's outcome
        if (firstFired.outcome === "failed") {
          title = "Failed Card";
          pillLabel = "Failed";
          pillColor = "error";
        } else if (firstFired.outcome === "cascade") {
          title = "Cascaded Card";
          pillLabel = "Cascade";
          pillColor = "warning";
        } else {
          title = "Fired Card";
          pillLabel = "Success";
          pillColor = "success";
        }
      }
    }
  }

  const billingAddr = detail
    ? `${detail.billing.street}, ${detail.billing.city}, ${detail.billing.state} ${detail.billing.zipCode}`
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
            {detail && pillLabel && <Chip label={pillLabel} size="small" color={pillColor} />}
          </Stack>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>}
        {detail && (
          <Stack spacing={2.5}>
            {/* Info bar */}
            <InfoBar items={[
              {
                icon: <CreditCardIcon />,
                label: "Card",
                value: `•••• ${detail.last4}`,
                subtitle: `exp ${detail.expMonth.padStart(2, "0")}/${detail.expYear}`,
              },
              {
                icon: <PersonOutlineIcon />,
                label: "Cardholder",
                value: detail.name,
                subtitle: detail.contact.email,
              },
              {
                icon: <HistoryIcon />,
                label: "History",
                value: detail.schedules.length === 0
                  ? "Never used"
                  : `${detail.schedules.length} schedule${detail.schedules.length === 1 ? "" : "s"}`,
                subtitle: detail.schedules.length === 0
                  ? "in the pool"
                  : (() => {
                      const firstPending = detail.schedules.find(s => s.status === "pending");
                      if (firstPending) return `next: ${dayjs.utc(firstPending.scheduledForIso).format("MMM D, h:mm A")}`;
                      const lastFired = detail.schedules.find(s => s.status === "fired");
                      if (lastFired) return `last fired: ${dayjs.utc(lastFired.firedAtIso ?? "").format("MMM D, h:mm A")}`;
                      return "";
                    })(),
              },
              {
                icon: <CreditCardIcon />,
                label: "Source",
                value: detail.sourceFile || "—",
                subtitle: detail.createdAt ? `uploaded ${dayjs.utc(detail.createdAt).format("MMM D")}` : "",
              },
            ]} />

            {/* Schedules — adapts to card state */}
            <SchedulesSection
              schedules={detail.schedules}
              onOpenSchedule={(s) => {
                if (s.status === "pending" || s.status === "processing") setPendingScheduleId(s.scheduleId);
                else if (s.status === "fired") setFiredScheduleId(s.scheduleId);
              }}
            />

            {/* Read-only pair at the bottom */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SectionCard title="Cardholder Details" icon={<PersonOutlineIcon />}>
                  <Row label="Email" value={detail.contact.email} copyable width={100} />
                  <Row label="Phone" value={detail.contact.phone} copyable width={100} />
                  <Row label="IP Address" value={detail.contact.ipAddress} mono copyable width={100} />
                  <Row label="Billing" value={billingAddr} width={100} />
                  <Row label="Source" value={detail.sourceFile} copyable width={100} />
                  <Row label="Uploaded" value={detail.createdAt ? dayjs.utc(detail.createdAt).format("MMM D, YYYY • h:mm A") : "—"} width={100} />
                </SectionCard>
              </Box>
              <Box sx={{ flex: "0 0 auto", width: { xs: "100%", md: 400 } }}>
                <SectionCard title="Virtual Card" icon={<CreditCardIcon />}>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <CardVisual
                      last4={detail.last4}
                      name={detail.name}
                      expMonth={detail.expMonth}
                      expYear={detail.expYear}
                      sourceFile={detail.sourceFile}
                      onReveal={() => revealCardSecretsByCardId(detail.cardId)}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
                    Click card to reveal full PAN + CVV
                  </Typography>
                </SectionCard>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <PendingScheduleModal
        open={pendingScheduleId !== null}
        scheduleId={pendingScheduleId}
        onClose={() => setPendingScheduleId(null)}
      />
      <FireAttemptsModal
        open={firedScheduleId !== null}
        scheduleId={firedScheduleId}
        onClose={() => setFiredScheduleId(null)}
      />
    </Dialog>
  );
}

function SchedulesSection({
  schedules, onOpenSchedule,
}: { schedules: ScheduleSummary[]; onOpenSchedule: (s: ScheduleSummary) => void }) {
  if (schedules.length === 0) {
    return (
      <SectionCard title="Schedules" icon={<HistoryIcon />}>
        <Typography variant="body2" color="text.secondary">
          This card hasn&apos;t been used in any flow yet. It&apos;s sitting in the pool.
        </Typography>
      </SectionCard>
    );
  }
  return (
    <SectionCard title={`Schedules (${schedules.length})`} icon={<HistoryIcon />}>
      <Stack spacing={1.5}>
        {schedules.map(s => <ScheduleRow key={s.scheduleId} s={s} onOpen={() => onOpenSchedule(s)} />)}
      </Stack>
    </SectionCard>
  );
}

function ScheduleRow({ s, onOpen }: { s: ScheduleSummary; onOpen: () => void }) {
  let borderColor = "grey.400";
  let stateChip: { label: string; color: "success" | "error" | "warning" | "info" | "default" } = { label: "Pending", color: "warning" };
  if (s.status === "pending") {
    borderColor = "warning.main";
    stateChip = { label: "Pending", color: "warning" };
  } else if (s.status === "processing") {
    borderColor = "info.main";
    stateChip = { label: "Processing", color: "info" };
  } else if (s.outcome === "success") {
    borderColor = "success.main";
    stateChip = { label: "Success", color: "success" };
  } else if (s.outcome === "failed") {
    borderColor = "error.main";
    stateChip = { label: "Failed", color: "error" };
  } else if (s.outcome === "cascade") {
    borderColor = "warning.main";
    stateChip = { label: `Cascade ↪ ${s.plannedMid}→${s.actualMid}`, color: "warning" };
  }

  const sched = dayjs.utc(s.scheduledForIso);
  const fired = s.firedAtIso ? dayjs.utc(s.firedAtIso) : null;

  return (
    <Box sx={{
      borderLeft: 4, borderLeftColor: borderColor,
      border: 1, borderColor: "divider",
      borderRadius: 1.5, p: 2, bgcolor: "var(--app-panel2)",
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Link href={`/flows/${s.flowId}`} target="_blank" style={{ color: "var(--app-accent)", textDecoration: "none" }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{s.flowName}</Typography>
                <OpenInNewIcon sx={{ fontSize: 14 }} />
              </Stack>
            </Link>
            <Chip label={stateChip.label} size="small" color={stateChip.color} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Scheduled {sched.format("MMM D, YYYY • h:mm A")} BKK
            {fired && (
              <> · Fired {fired.format("h:mm:ss A")}</>
            )}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          {s.amountPaid != null && (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>${s.amountPaid.toFixed(2)}</Typography>
          )}
          {s.orderId && (
            <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
              <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{s.orderId}</Typography>
              <Tooltip title="Copy order ID">
                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => navigator.clipboard.writeText(s.orderId!)}>
                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          <Button
            size="small" startIcon={<VisibilityIcon />} onClick={onOpen}
            sx={{ textTransform: "none", mt: 0.5, py: 0.25 }}
          >
            View details
          </Button>
        </Box>
      </Stack>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {s.plan.product_name} <span style={{ color: "var(--app-faint)" }}>#{s.plan.product_id}</span>
        {" · "}
        ${s.plan.price.toFixed(2)}
        {" · "}
        MID {s.plan.cc_gateway_id}
      </Typography>
      {s.ccMessage && s.outcome === "failed" && (
        <Box sx={{ mt: 1, p: 1, bgcolor: "var(--app-bad-soft)", borderRadius: 1, border: "1px solid", borderColor: "error.light" }}>
          <Typography variant="caption">
            <b>Decline:</b> {s.ccMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
