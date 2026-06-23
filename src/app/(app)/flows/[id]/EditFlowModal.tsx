"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
  Typography, Alert, Box, IconButton, Table, TableHead, TableRow,
  TableCell, TableBody, Tooltip, MenuItem, Select, InputAdornment, CircularProgress,
  Chip, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BoltIcon from "@mui/icons-material/Bolt";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BarChartIcon from "@mui/icons-material/BarChart";
import BusinessIcon from "@mui/icons-material/Business";
import SellIcon from "@mui/icons-material/Sell";
import { useState, useTransition } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  updateFlow, deleteFlow,
  addProductToFlow, deleteProductFromFlow, fetchAvailableProducts,
} from "./actions";
import type { FlowSettings } from "@/lib/flows";
import { Section, SectionCard, Row, InfoBar } from "@/components/modal-shared";
dayjs.extend(utc);
const STATUS_CHIP_COLOR: Record<string, "success" | "warning" | "default"> = {
  active: "success", paused: "warning", completed: "default",
};

type AvailableProduct = { id: string; name: string; price: number; alreadyInFlow: boolean };

export type FlowProgress = {
  total: number;
  fired: number;
  succeeded: number;
  failed: number;
  pending: number;
  processing: number;
  nextPendingIso: string | null;
  lastFiredIso: string | null;
};

export default function EditFlowModal({
  flowId, flowName, settings, isFresh, createdAt, account, progress,
}: {
  flowId: string;
  flowName: string;
  settings: FlowSettings;
  isFresh: boolean;
  createdAt: string;
  account: { name: string; apiUrl: string };
  progress: FlowProgress;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(flowName);
  const [windowEnd, setWindowEnd] = useState(
    dayjs(settings.schedule_window.end_date).format("YYYY-MM-DD"),
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [showAddPicker, setShowAddPicker] = useState(false);
  const [available, setAvailable] = useState<AvailableProduct[] | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [pickedProductId, setPickedProductId] = useState("");
  const [pickedPrice, setPickedPrice] = useState(0);

  const originalEnd = dayjs(settings.schedule_window.end_date).format("YYYY-MM-DD");
  const dirty = name.trim() !== flowName || windowEnd !== originalEnd;

  function reset() {
    setName(flowName);
    setWindowEnd(originalEnd);
    setError(null);
    setConfirming(false);
    setShowAddPicker(false);
    setAvailable(null);
    setPickedProductId("");
    setPickedPrice(0);
  }
  function close() {
    if (pending) return;
    reset();
    setOpen(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateFlow(flowId, {
          name: name.trim() !== flowName ? name : undefined,
          scheduleWindowEnd: windowEnd !== originalEnd ? windowEnd : undefined,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }
  function doDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteFlow(flowId);
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Delete failed");
        setConfirming(false);
      }
    });
  }
  async function openAddPicker() {
    setShowAddPicker(true);
    setError(null);
    if (!available) {
      setLoadingCatalog(true);
      try {
        const list = await fetchAvailableProducts(flowId);
        setAvailable(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load CC catalog");
      }
      setLoadingCatalog(false);
    }
  }
  function pickProduct(productId: string) {
    setPickedProductId(productId);
    const product = available?.find(p => p.id === productId);
    if (product) setPickedPrice(product.price);
  }
  function doAddProduct() {
    const product = available?.find(p => p.id === pickedProductId);
    if (!product) return;
    setError(null);
    startTransition(async () => {
      try {
        await addProductToFlow(flowId, { id: product.id, name: product.name, price: pickedPrice });
        setShowAddPicker(false);
        setPickedProductId("");
        setAvailable(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Add failed");
      }
    });
  }
  function doDeleteProduct(productId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteProductFromFlow(flowId, productId);
        setAvailable(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  const addable = (available ?? []).filter(p => !p.alreadyInFlow);

  return (
    <>
      <IconButton size="small" onClick={() => setOpen(true)} aria-label="Edit flow">
        <EditIcon fontSize="small" />
      </IconButton>

      <Dialog open={open} onClose={close} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Flow Settings</Typography>
              <Chip
                label={settings.lifecycle.status} size="small"
                color={STATUS_CHIP_COLOR[settings.lifecycle.status] ?? "default"}
              />
            </Stack>
            <IconButton size="small" onClick={close}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <InfoBar items={[
              {
                icon: <BoltIcon />,
                label: "Flow",
                value: flowName,
                subtitle: settings.lifecycle.status === "active" ? "Active" : settings.lifecycle.status,
              },
              {
                icon: <CalendarTodayIcon />,
                label: "Window",
                value: `${dayjs.utc(settings.schedule_window.start_date).format("MMM D")} – ${dayjs.utc(settings.schedule_window.end_date).format("MMM D")}`,
                subtitle: "BKK",
              },
              {
                icon: <BarChartIcon />,
                label: "Progress",
                value: `${progress.fired} / ${progress.total} fired`,
                subtitle: `${progress.succeeded} succeeded${progress.failed > 0 ? ` · ${progress.failed} failed` : ""}`,
              },
              {
                icon: <BusinessIcon />,
                label: "Routing",
                value: `MID ${settings.cc_gateway.id}`,
                subtitle: settings.cc_campaign.name,
              },
            ]} />

            <SectionCard title="Edit" icon={<EditIcon />}>
              <Stack spacing={1.5}>
                <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth size="small" />
                <TextField
                  label="Schedule window end (BKK)" type="date" size="small"
                  value={windowEnd} onChange={e => setWindowEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Extend to schedule more, or shrink (refused if any pending sits past the new end)."
                />
              </Stack>
            </SectionCard>

            <SectionCard
              title="Products"
              icon={<SellIcon />}
              action={
                !showAddPicker && (
                  <Button size="small" startIcon={<AddIcon />} onClick={openAddPicker} disabled={pending}>
                    Add product
                  </Button>
                )
              }
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>Price</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>Schedules</TableCell>
                    <TableCell align="right" sx={{ width: 60 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {settings.cc_products.map(p => {
                    const canDelete = p.count === 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.name} <span style={{ color: "#888" }}>#{p.id}</span></TableCell>
                        <TableCell align="right">${p.price.toFixed(2)}</TableCell>
                        <TableCell align="right">{p.count}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={canDelete
                            ? "Remove product from flow"
                            : `${p.count} schedule${p.count === 1 ? "" : "s"} use this — delete those first`}
                          >
                            <span>
                              <IconButton
                                size="small" color="error" disabled={!canDelete || pending}
                                onClick={() => doDeleteProduct(p.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {showAddPicker && (
                <Box sx={{ mt: 2, p: 2, bgcolor: "#fafafa", borderRadius: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">Add a product</Typography>
                    <Button size="small" onClick={() => setShowAddPicker(false)} disabled={pending}>Close</Button>
                  </Stack>
                  {loadingCatalog && <Stack alignItems="center"><CircularProgress size={24} /></Stack>}
                  {!loadingCatalog && available && addable.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      All products from this campaign are already in the flow.
                    </Typography>
                  )}
                  {!loadingCatalog && addable.length > 0 && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Select
                        size="small" value={pickedProductId}
                        onChange={e => pickProduct(String(e.target.value))}
                        displayEmpty sx={{ minWidth: 260 }}
                      >
                        <MenuItem value="" disabled>Pick a product…</MenuItem>
                        {addable.map(p => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} <span style={{ color: "#888", marginLeft: 8 }}>#{p.id} · ${p.price.toFixed(2)}</span>
                          </MenuItem>
                        ))}
                      </Select>
                      <TextField
                        size="small" type="number" label="Price"
                        value={pickedPrice}
                        onChange={e => setPickedPrice(Number(e.target.value) || 0)}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        inputProps={{ step: 0.01, min: 0, style: { textAlign: "right" } }}
                        sx={{ width: 110 }}
                        disabled={!pickedProductId}
                      />
                      <Button
                        size="small" variant="contained" onClick={doAddProduct}
                        disabled={!pickedProductId || pending}
                      >
                        Add
                      </Button>
                    </Stack>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Adding a product doesn&apos;t schedule any cards — use <b>Add cards</b> after to schedule.
                  </Typography>
                </Box>
              )}
            </SectionCard>

            <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Status & timing</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, alignSelf: "center" }}>
                  lifecycle · progress counts
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2 }}>
                <Stack spacing={2.5}>
                  <CompressedStatus settings={settings} />
                  <CompressedProgress progress={progress} />
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Reference</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, alignSelf: "center" }}>
                  ID · created · routing · account
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2 }}>
                <Stack spacing={2.5}>
                  <CompressedIdentity flowId={flowId} createdAt={createdAt} />
                  <CompressedRouting settings={settings} />
                  <CompressedAccount account={account} />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {confirming && (
              <Alert
                severity="warning"
                action={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button>
                    <Button size="small" color="error" variant="contained" onClick={doDelete} disabled={pending}>
                      {pending ? "Deleting…" : "Yes, delete flow"}
                    </Button>
                  </Stack>
                }
              >
                Delete this entire flow. All pending cards return to the pool. Nothing has fired so no history is lost.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
          {isFresh ? (
            <Button
              color="error" startIcon={<DeleteIcon />}
              onClick={() => setConfirming(true)}
              disabled={pending || confirming}
            >
              Delete flow
            </Button>
          ) : (
            <Box sx={{ color: "text.disabled", fontSize: 12, fontStyle: "italic" }}>
              Delete disabled — fire history exists
            </Box>
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={close} disabled={pending}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!dirty || pending}>
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Compressed read-only sections (Status & timing + Reference accordions)
// Kept local — only used here.
// ---------------------------------------------------------------------------

function CompressedStatus({ settings }: { settings: FlowSettings }) {
  return (
    <Section title="Status" dense>
      <Stack direction="row" spacing={4}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Paused at</Typography>
          <Typography variant="body2">
            {settings.lifecycle.paused_at ? dayjs.utc(settings.lifecycle.paused_at).format("MMM D, h:mm A") : "—"}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Last charged</Typography>
          <Typography variant="body2">
            {settings.lifecycle.last_charged_at ? dayjs.utc(settings.lifecycle.last_charged_at).format("MMM D, h:mm A") : "—"}
          </Typography>
        </Box>
      </Stack>
    </Section>
  );
}

function CompressedProgress({ progress }: { progress: FlowProgress }) {
  return (
    <Section title="Progress" dense>
      <Typography variant="body2">
        Total {progress.total} · Fired {progress.fired} · Succeeded {progress.succeeded} · Failed {progress.failed} · Pending {progress.pending} · Processing {progress.processing}
      </Typography>
      <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Next pending</Typography>
          <Typography variant="body2">
            {progress.nextPendingIso ? dayjs.utc(progress.nextPendingIso).format("MMM D, h:mm A") : "—"}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Last fired</Typography>
          <Typography variant="body2">
            {progress.lastFiredIso ? dayjs.utc(progress.lastFiredIso).format("MMM D, h:mm A") : "—"}
          </Typography>
        </Box>
      </Stack>
    </Section>
  );
}

function CompressedIdentity({ flowId, createdAt }: { flowId: string; createdAt: string }) {
  return (
    <Section title="Identity" dense>
      <Row label="Flow ID" value={flowId} mono copyable />
      <Row label="Created" value={dayjs.utc(createdAt).format("MMM D, YYYY · h:mm A")} />
    </Section>
  );
}

function CompressedRouting({ settings }: { settings: FlowSettings }) {
  return (
    <Section title="Routing (locked)" dense>
      <Row label="Gateway" value={`MID ${settings.cc_gateway.id} · ${settings.cc_gateway.name}`} />
      <Row label="Campaign" value={`${settings.cc_campaign.name} (#${settings.cc_campaign.id})`} />
    </Section>
  );
}

function CompressedAccount({ account }: { account: { name: string; apiUrl: string } }) {
  return (
    <Section title="Account" dense>
      <Typography variant="body2">
        {account.name} <span style={{ color: "#888" }}>·</span> {account.apiUrl}
      </Typography>
    </Section>
  );
}
