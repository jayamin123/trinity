"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, Stack,
  Accordion, AccordionSummary, AccordionDetails, CircularProgress, IconButton, Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SellIcon from "@mui/icons-material/Sell";
import BusinessIcon from "@mui/icons-material/Business";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplayIcon from "@mui/icons-material/Replay";
import HistoryIcon from "@mui/icons-material/History";
import { useEffect, useState, useTransition } from "react";
import { TextField, Alert } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import dynamic from "next/dynamic";
import { getScheduleDetail, revealCardSecrets, type ScheduleDetail } from "./detail-action";
import { retryFailedSchedule } from "./actions";
import { InfoBar, SectionCard, Row, CardVisual } from "@/components/modal-shared";
import { nowBkk } from "@/lib/bkk";

// Lazy-loaded to break the circular import (CardModal references FireAttemptsModal).
const CardModal = dynamic(() => import("../../cards/CardModal"), { ssr: false });
dayjs.extend(utc);

type Attempt = ScheduleDetail["attempts"][number];

export default function FireAttemptsModal({
  open, scheduleId, onClose,
}: {
  open: boolean;
  scheduleId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !scheduleId) { setDetail(null); return; }
    setLoading(true);
    getScheduleDetail(scheduleId)
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [open, scheduleId]);

  if (!open) return null;

  const lastAttempt = detail?.attempts[detail.attempts.length - 1];

  // Title + pill: Successful Purchase / Failed Purchase / Cascaded Purchase
  let title = "Purchase";
  let pillLabel = "";
  let pillColor: "success" | "error" | "warning" | "default" = "default";
  if (detail && lastAttempt) {
    if (!lastAttempt.success) {
      title = "Failed Purchase";
      pillLabel = "Failed";
      pillColor = "error";
    } else if (lastAttempt.cascade_used) {
      title = "Cascaded Purchase";
      pillLabel = "Cascade";
      pillColor = "warning";
    } else {
      title = "Successful Purchase";
      pillLabel = "Success";
      pillColor = "success";
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
            {detail && <Chip label={pillLabel} size="small" color={pillColor} />}
          </Stack>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>}
        {detail && lastAttempt && (
          <Stack spacing={2.5}>
            <FiredInfoBar detail={detail} attempt={lastAttempt} />
            <OrderHeader detail={detail} attempt={lastAttempt} />
            {!lastAttempt.success && <RetrySection detail={detail} onSuccess={onClose} />}
            <PlanVsActualSection detail={detail} attempt={lastAttempt} />
            <CardholderAndCard detail={detail} onOpenCardModal={() => setCardModalOpen(true)} />
            <CCRecordSection attempt={lastAttempt} />
            {detail.attempts.length > 1 && <AttemptsListSection attempts={detail.attempts} />}
            <RawJsonSection raw={lastAttempt.cc_response.raw} />
          </Stack>
        )}
        {detail && !lastAttempt && (
          <Typography color="text.secondary">No attempts on this schedule yet.</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      {detail && (
        <CardModal
          open={cardModalOpen}
          cardId={cardModalOpen ? detail.cardId : null}
          onClose={() => setCardModalOpen(false)}
        />
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function FiredInfoBar({ detail, attempt }: { detail: ScheduleDetail; attempt: Attempt }) {
  const raw = parseRaw(attempt.cc_response.raw);
  const item = raw?.items?.[0];
  const actualMid = attempt.actual_cc_gateway_id ?? item?.merchantId ?? null;
  const fired = dayjs.utc(attempt.fired_at);
  return (
    <InfoBar items={[
      {
        icon: <CalendarTodayIcon />,
        label: "Fired at",
        value: fired.format("MMM D, YYYY • h:mm A"),
        subtitle: fired.format("dddd") + " BKK",
      },
      {
        icon: <CreditCardIcon />,
        label: "Payment Method",
        value: `•••• ${detail.card.last4}`,
        subtitle: detail.card.name,
      },
      {
        icon: <SellIcon />,
        label: "Product",
        value: detail.plan.product_name,
        subtitle: `#${detail.plan.product_id} · $${detail.plan.price.toFixed(2)}${attempt.amount_paid != null ? ` · ${attempt.success ? "paid" : "attempted"} $${attempt.amount_paid.toFixed(2)}` : ""}`,
      },
      {
        icon: <BusinessIcon />,
        label: "Processing",
        value: `MID ${actualMid ?? detail.plan.cc_gateway_id}`,
        subtitle: detail.flow.ccGateway.name,
      },
    ]} />
  );
}

function OrderHeader({ detail, attempt }: { detail: ScheduleDetail; attempt: Attempt }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          Order
        </Typography>
        <Typography sx={{ fontFamily: "monospace", fontWeight: 600 }}>
          {detail.orderId ?? "—"}
        </Typography>
        {detail.orderId && (
          <Tooltip title="Copy order ID">
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(detail.orderId!)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Flow <b>{detail.flowName}</b>  ·  {detail.flow.ccCampaignName}
      </Typography>
      {!attempt.success && (
        <Box sx={{ p: 1.25, bgcolor: "var(--app-bad-soft)", borderRadius: 1, border: "1px solid", borderColor: "error.light", maxWidth: { sm: "60%" } }}>
          <Typography variant="body2">
            <b>Decline reason:</b> {attempt.cc_response.message || "(no message)"}
            {attempt.cc_response.code && <span style={{ color: "var(--app-faint)", marginLeft: 8 }}>Code: {attempt.cc_response.code}</span>}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

function RetrySection({ detail, onSuccess }: { detail: ScheduleDetail; onSuccess: () => void }) {
  // Default to "now + 5 minutes" BKK — soon-ish but with buffer for the cron cycle.
  const defaultIso = dayjs.utc(nowBkk()).add(5, "minute");
  const [dateStr, setDateStr] = useState(defaultIso.format("YYYY-MM-DD"));
  const [timeStr, setTimeStr] = useState(defaultIso.format("HH:mm"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    const newIso = new Date(`${dateStr}T${timeStr}:00.000Z`).toISOString();
    startTransition(async () => {
      try {
        await retryFailedSchedule(detail.scheduleId, newIso);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Retry failed");
      }
    });
  }

  return (
    <SectionCard title="Retry this fire" icon={<ReplayIcon />}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Pick a new time and the cron will try again. The original failed attempt stays in the audit trail.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
        <TextField
          label="Date (BKK)" type="date" size="small" value={dateStr}
          onChange={e => setDateStr(e.target.value)} InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Time (BKK)" type="time" size="small" value={timeStr}
          onChange={e => setTimeStr(e.target.value)} InputLabelProps={{ shrink: true }}
          inputProps={{ step: 60 }}
        />
        <Button variant="contained" color="primary" onClick={handleRetry} disabled={pending} startIcon={<ReplayIcon />}>
          {pending ? "Retrying…" : "Retry"}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
    </SectionCard>
  );
}

function PlanVsActualSection({ detail, attempt }: { detail: ScheduleDetail; attempt: Attempt }) {
  const raw = parseRaw(attempt.cc_response.raw);
  const item = raw?.items?.[0];
  const actualProductName = item?.name ?? "—";
  const actualProductId = item?.actualProductId ?? item?.productId ?? "—";
  const actualMid = attempt.actual_cc_gateway_id ?? item?.merchantId ?? null;
  const descriptor = item?.descriptor ?? "—";
  const cascaded = attempt.cascade_used || (actualMid !== null && actualMid !== detail.plan.cc_gateway_id);
  const sched = dayjs.utc(detail.scheduledForIso);
  const fired = dayjs.utc(attempt.fired_at);
  const lateMinutes = Math.floor(fired.diff(sched, "minute"));
  const lateLabel = formatLateLabel(lateMinutes);

  return (
    <SectionCard
      title="Plan vs Actual"
      icon={<ReceiptLongIcon />}
      action={
        cascaded
          ? <Chip label={`↪ cascade ${detail.plan.cc_gateway_id} → ${actualMid}`} size="small" color="warning" />
          : attempt.success ? <Chip label="✓ no cascade" size="small" color="success" variant="outlined" /> : null
      }
    >
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        <Stack direction="row" sx={{ bgcolor: "var(--app-panel2)", borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ width: 140, py: 1, px: 2 }} />
          <Box sx={{ flex: 1, py: 1, px: 2, borderLeft: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
              Planned
            </Typography>
          </Box>
          <Box sx={{ flex: 1, py: 1, px: 2, borderLeft: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
              Actual
            </Typography>
          </Box>
        </Stack>

        <DiffRow
          label="Time"
          planned={sched.format("MMM D, h:mm A")}
          actual={
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <span>{fired.format("MMM D, h:mm:ss A")}</span>
              {lateLabel && (
                <Chip
                  label={lateLabel} size="small"
                  color={lateMinutes > 60 ? "error" : "warning"} variant="outlined"
                  sx={{ height: 20, fontSize: 11 }}
                />
              )}
            </Stack>
          }
          highlight={lateMinutes > 60 ? "mismatch" : undefined}
        />
        <DiffRow
          label="Product"
          planned={<>{detail.plan.product_name} <span style={{ color: "var(--app-faint)" }}>#{detail.plan.product_id}</span></>}
          actual={<>{actualProductName} <span style={{ color: "var(--app-faint)" }}>#{actualProductId}</span></>}
        />
        <DiffRow
          label="Price"
          planned={`$${detail.plan.price.toFixed(2)}`}
          actual={attempt.amount_paid != null ? `$${attempt.amount_paid.toFixed(2)} paid` : "—"}
        />
        <DiffRow
          label="Gateway (MID)"
          planned={detail.plan.cc_gateway_id}
          actual={actualMid ?? "—"}
          highlight={cascaded ? "mismatch" : undefined}
        />
        <DiffRow
          label="Descriptor"
          planned="—"
          actual={<span style={{ fontFamily: "monospace" }}>{descriptor}</span>}
        />
      </Box>
    </SectionCard>
  );
}

function DiffRow({
  label, planned, actual, highlight,
}: {
  label: string;
  planned: React.ReactNode;
  actual: React.ReactNode;
  highlight?: "mismatch";
}) {
  return (
    <Stack
      direction="row"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        "&:first-of-type": { borderTop: 0 },
        bgcolor: highlight === "mismatch" ? "#fff7ed" : "transparent",
      }}
    >
      <Box sx={{ width: 140, py: 1.25, px: 2 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
      <Box sx={{ flex: 1, py: 1.25, px: 2, borderLeft: 1, borderColor: "divider", fontSize: 14 }}>
        {planned}
      </Box>
      <Box sx={{ flex: 1, py: 1.25, px: 2, borderLeft: 1, borderColor: "divider", fontSize: 14 }}>
        {actual}
      </Box>
    </Stack>
  );
}

function CardholderAndCard({ detail, onOpenCardModal }: { detail: ScheduleDetail; onOpenCardModal: () => void }) {
  const billingAddr = `${detail.card.billing.street}, ${detail.card.billing.city}, ${detail.card.billing.state} ${detail.card.billing.zipCode}`;
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SectionCard
          title="Cardholder Details"
          icon={<PersonOutlineIcon />}
          action={
            <Button size="small" startIcon={<HistoryIcon />} onClick={onOpenCardModal} sx={{ textTransform: "none" }}>
              View card history
            </Button>
          }
        >
          <Row label="Email" value={detail.card.contact.email} copyable width={100} />
          <Row label="Phone" value={detail.card.contact.phone} copyable width={100} />
          <Row label="IP Address" value={detail.card.contact.ipAddress} mono copyable width={100} />
          <Row label="Billing" value={billingAddr} width={100} />
          <Row label="Source" value={detail.card.sourceFile} copyable width={100} />
          <Row label="Uploaded" value={detail.card.createdAt ? dayjs.utc(detail.card.createdAt).format("MMM D, YYYY • h:mm A") : "—"} width={100} />
        </SectionCard>
      </Box>
      <Box sx={{ flex: "0 0 auto", width: { xs: "100%", md: 400 } }}>
        <SectionCard title="Virtual Card" icon={<CreditCardIcon />}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CardVisual
              last4={detail.card.last4}
              name={detail.card.name}
              expMonth={detail.card.expMonth}
              expYear={detail.card.expYear}
              sourceFile={detail.card.sourceFile}
              onReveal={() => revealCardSecrets(detail.scheduleId)}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
            Click card to reveal full PAN + CVV
          </Typography>
        </SectionCard>
      </Box>
    </Stack>
  );
}

function CCRecordSection({ attempt }: { attempt: Attempt }) {
  const raw = parseRaw(attempt.cc_response.raw);
  if (!raw) return null;

  const billingAddr = `${raw.address1 ?? ""}, ${raw.city ?? ""} ${raw.state ?? ""} ${raw.postalCode ?? ""}`.trim();
  const shipAddr = `${raw.shipAddress1 ?? ""}, ${raw.shipCity ?? ""} ${raw.shipState ?? ""} ${raw.shipPostalCode ?? ""}`.trim();
  const shipSameAsBilling = billingAddr === shipAddr;
  const item = raw.items?.[0];
  const isRecurring = item?.nextBillDate || (item?.cycle2_price && item.cycle2_price !== "");

  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>CheckoutChamp record</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2 }}>
        <Box sx={{ "& > *": { mb: 0.4 } }}>
          <Row label="Order status" value={`${raw.orderStatus ?? "—"} (${raw.orderType ?? "—"})`} />
          <Row label="CC date created" value={raw.dateCreated ?? "—"} />
          <Row label="CC customer ID" value={String(raw.customerId ?? "—")} mono />
          <Row label="CC merchantTxnId" value={String(raw.merchantTxnId ?? item?.merchantTxnId ?? "—")} mono />
          <Row label="Campaign" value={`${raw.campaignName ?? "—"} (#${raw.campaignId ?? "—"})`} />
          <Row label="Card" value={`${raw.cardType ?? "—"} · BIN ${raw.cardBin ?? "—"} · exp ${raw.cardExpiryDate ?? "—"}`} />
          <Row label="" value={`prepaid: ${raw.cardIsPrepaid ? "yes" : "no"} · debit: ${raw.cardIsDebit ? "yes" : "no"}`} />
          <Row label="IP" value={raw.ipAddress ?? "—"} mono copyable />
          <Row label="Billing" value={billingAddr || "—"} />
          <Row label="Ship address" value={shipSameAsBilling ? "same as billing" : (shipAddr || "—")} />
          <Row
            label="Money"
            value={
              `subtotal $${raw.subTotal ?? "0"} · ship $${raw.shipTotal ?? "0"} · tax $${raw.taxTotal ?? "0"} · ` +
              `discount $${raw.totalDiscount ?? "0"} · refundable $${raw.totalRefundRemaining ?? "0"} ${raw.baseCurrencyCode ?? ""}`
            }
          />
          <Row
            label="Recurring"
            value={isRecurring
              ? `recurring · next bill ${item?.nextBillDate || "?"} · cycle ${item?.billingCycleNumber || "?"}`
              : "one-shot (no recurring)"
            }
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function AttemptsListSection({ attempts }: { attempts: Attempt[] }) {
  return (
    <SectionCard title={`Attempts (${attempts.length})`}>
      <Stack spacing={1}>
        {attempts.map((a, i) => (
          <Accordion key={i} defaultExpanded={i === attempts.length - 1}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  #{i + 1}  {dayjs.utc(a.fired_at).format("MMM D, h:mm:ss A")}
                </Typography>
                <Chip label={a.success ? "Success" : "Failed"} size="small" color={a.success ? "success" : "error"} />
                <Typography variant="body2">MID {a.actual_cc_gateway_id ?? "—"}</Typography>
                {a.cascade_used && <Chip label="cascade" size="small" color="warning" variant="outlined" />}
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{a.order_id ?? "—"}</Typography>
                <Typography variant="body2">{a.amount_paid != null ? `$${a.amount_paid.toFixed(2)}` : "—"}</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2"><b>Code:</b> {a.cc_response.code || "—"}</Typography>
              <Typography variant="body2"><b>Message:</b> {a.cc_response.message || "—"}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </SectionCard>
  );
}

function RawJsonSection({ raw }: { raw: string }) {
  const pretty = (() => {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  })();
  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Raw CC response</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Tooltip title="Copy to clipboard">
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(pretty)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ fontFamily: "monospace", fontSize: 11, p: 1.5, bgcolor: "var(--app-panel2)", borderRadius: 1, maxHeight: 320, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {pretty || "—"}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function formatLateLabel(lateMinutes: number): string | null {
  if (lateMinutes <= 5) return null;
  if (lateMinutes < 60) return `${lateMinutes}m late`;
  const hours = Math.floor(lateMinutes / 60);
  const mins = lateMinutes % 60;
  return mins === 0 ? `${hours}h late` : `${hours}h ${mins}m late`;
}

type CCRaw = {
  orderStatus?: string; orderType?: string; dateCreated?: string;
  customerId?: number; merchantTxnId?: string;
  campaignName?: string; campaignId?: number;
  cardType?: string; cardBin?: string; cardExpiryDate?: string;
  cardIsPrepaid?: number; cardIsDebit?: number;
  ipAddress?: string;
  address1?: string; city?: string; state?: string; postalCode?: string;
  shipAddress1?: string; shipCity?: string; shipState?: string; shipPostalCode?: string;
  subTotal?: string; shipTotal?: string; taxTotal?: string; totalDiscount?: string; totalRefundRemaining?: string;
  baseCurrencyCode?: string;
  items?: Array<{
    productId?: string; name?: string; actualProductId?: string;
    merchantId?: string; descriptor?: string; merchantTxnId?: string;
    nextBillDate?: string; billingCycleNumber?: string; cycle2_price?: string;
  }>;
};

function parseRaw(raw: string): CCRaw | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object" && obj.message && typeof obj.message === "object") ? obj.message : obj;
  } catch {
    return null;
  }
}
