"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, Stack,
  TextField, Select, MenuItem, CircularProgress, Alert, IconButton, InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SellIcon from "@mui/icons-material/Sell";
import BusinessIcon from "@mui/icons-material/Business";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HistoryIcon from "@mui/icons-material/History";
import CardModal from "../../cards/CardModal";
import { useEffect, useState, useTransition } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { getScheduleDetail, revealCardSecrets, type ScheduleDetail } from "./detail-action";
import { updateSchedule, deleteSchedule, fetchAvailableGatewaysForSchedule } from "./actions";
import { InfoBar, SectionCard, Row, CardVisual } from "@/components/modal-shared";
dayjs.extend(utc);

export default function PendingScheduleModal({
  open, scheduleId, onClose,
}: {
  open: boolean;
  scheduleId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState(0);
  const [ccGatewayId, setCcGatewayId] = useState("");
  const [gateways, setGateways] = useState<{ id: string; title: string }[] | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !scheduleId) { setDetail(null); setError(null); setGateways(null); return; }
    setLoading(true);
    getScheduleDetail(scheduleId)
      .then(d => {
        setDetail(d);
        if (d) {
          const bkk = dayjs.utc(d.scheduledForIso);
          setDateStr(bkk.format("YYYY-MM-DD"));
          setTimeStr(bkk.format("HH:mm"));
          setProductId(d.plan.product_id);
          setPrice(d.plan.price);
          setCcGatewayId(d.plan.cc_gateway_id);
        }
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    fetchAvailableGatewaysForSchedule(scheduleId)
      .then(list => setGateways(list))
      .catch(() => setGateways([]));
  }, [open, scheduleId]);

  if (!open) return null;

  const dirty = detail && (
    dateStr !== dayjs.utc(detail.scheduledForIso).format("YYYY-MM-DD") ||
    timeStr !== dayjs.utc(detail.scheduledForIso).format("HH:mm") ||
    productId !== detail.plan.product_id ||
    price !== detail.plan.price ||
    ccGatewayId !== detail.plan.cc_gateway_id
  );

  function handleSave() {
    if (!detail) return;
    setError(null);
    const newIso = new Date(`${dateStr}T${timeStr}:00.000Z`).toISOString();
    startTransition(async () => {
      try {
        await updateSchedule(detail.scheduleId, { scheduledForIso: newIso, productId, price, ccGatewayId });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function handleDelete() {
    if (!detail) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteSchedule(detail.scheduleId);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setConfirmingDelete(false);
      }
    });
  }

  const sched = detail ? dayjs.utc(detail.scheduledForIso) : null;
  const currentProduct = detail?.flow.ccProducts.find(p => p.id === productId);
  const currentGateway = gateways?.find(g => g.id === ccGatewayId);
  const billingAddr = detail
    ? `${detail.card.billing.street}, ${detail.card.billing.city}, ${detail.card.billing.state} ${detail.card.billing.zipCode}`
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Scheduled Purchase</Typography>
            {detail && <Chip label="Pending" size="small" color="warning" />}
          </Stack>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>}
        {detail && sched && (
          <Stack spacing={2.5}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <InfoBar items={[
              {
                icon: <CalendarTodayIcon />,
                label: "Scheduled for",
                value: sched.format("MMM D, YYYY • h:mm A"),
                subtitle: `${sched.format("dddd")} BKK`,
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
                value: currentProduct?.name ?? detail.plan.product_name,
                subtitle: `SKU #${productId} · $${price.toFixed(2)}`,
              },
              {
                icon: <BusinessIcon />,
                label: "Processing",
                value: `MID ${ccGatewayId}`,
                subtitle: currentGateway?.title ?? detail.flow.ccGateway.name,
              },
            ]} />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
              {/* Left column: editable form sections */}
              <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
                <SectionCard title="Schedule" icon={<CalendarTodayIcon />}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Date (BKK)" type="date" size="small" value={dateStr}
                      onChange={e => setDateStr(e.target.value)} InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Time (BKK)" type="time" size="small" value={timeStr}
                      onChange={e => setTimeStr(e.target.value)} InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 60 }}
                      fullWidth
                    />
                  </Stack>
                </SectionCard>

                <SectionCard title="Purchase" icon={<SellIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Select
                      size="small" value={productId}
                      onChange={e => setProductId(String(e.target.value))}
                      sx={{ flexGrow: 1 }}
                    >
                      {detail.flow.ccProducts.map(p => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} <span style={{ color: "var(--app-faint)", marginLeft: 8 }}>#{p.id}</span>
                        </MenuItem>
                      ))}
                    </Select>
                    <TextField
                      label="Price" type="number" size="small" value={price}
                      onChange={e => setPrice(Number(e.target.value) || 0)}
                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                      inputProps={{ step: 0.01, min: 0, style: { textAlign: "right" } }}
                      sx={{ width: 130 }}
                    />
                  </Stack>
                </SectionCard>

                <SectionCard title="Processing" icon={<BusinessIcon />}>
                  {gateways === null ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="text.secondary">Loading CC gateways…</Typography>
                    </Stack>
                  ) : gateways.length === 0 ? (
                    <TextField
                      label="Gateway (MID)" size="small" value={ccGatewayId}
                      onChange={e => setCcGatewayId(e.target.value)}
                      helperText="Couldn't load CC catalog — enter the MID directly."
                      fullWidth
                    />
                  ) : (
                    <Select size="small" value={ccGatewayId} onChange={e => setCcGatewayId(String(e.target.value))} fullWidth>
                      {gateways.map(g => (
                        <MenuItem key={g.id} value={g.id}>
                          MID {g.id} <span style={{ color: "var(--app-faint)", marginLeft: 8 }}>· {g.title}</span>
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </SectionCard>
              </Stack>
            </Stack>

            {/* Read-only pair at the bottom: Cardholder Details LEFT, Virtual Card RIGHT */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SectionCard
                  title="Cardholder Details"
                  icon={<PersonOutlineIcon />}
                  action={
                    <Button size="small" startIcon={<HistoryIcon />} onClick={() => setCardModalOpen(true)} sx={{ textTransform: "none" }}>
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

            {confirmingDelete && (
              <Alert
                severity="warning"
                action={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => setConfirmingDelete(false)} disabled={pending}>Cancel</Button>
                    <Button size="small" color="error" variant="contained" onClick={handleDelete} disabled={pending}>
                      {pending ? "Deleting…" : "Yes, delete"}
                    </Button>
                  </Stack>
                }
              >
                Card •••• {detail.card.last4} will return to the pool. This row will be removed.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Button
          color="error" startIcon={<DeleteIcon />}
          onClick={() => setConfirmingDelete(true)}
          disabled={pending || !detail || confirmingDelete}
        >
          Delete Schedule
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </Stack>
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
