"use client";
import {
  Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Typography, Chip, IconButton, Box, Collapse,
  TextField, Select, MenuItem, Stack, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Fragment, useState, useTransition } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import FireAttemptsModal from "./FireAttemptsModal";
import PendingScheduleModal from "./PendingScheduleModal";
import { updateSchedule, deleteSchedule } from "./actions";
dayjs.extend(utc);

type Product = { id: string; name: string; price: number };

type DayCard = {
  scheduleId: string;
  cardId: string;
  last4: string;
  name: string;
  scheduledFor: string;
  status: "fired-success" | "fired-failed" | "processing" | "pending";
  firedAt: string | null;
  orderId: string | null;
  plan: { product_id: string; product_name: string; price: number; cc_gateway_id: string };
  attemptCount: number;
};

type Rollup = {
  date: string;
  scheduled: number;
  succeeded: number;
  failed: number;
  pending: number;
  processing: number;
  cards: DayCard[];
};

const LABEL: Record<DayCard["status"], string> = {
  "fired-success": "Success", "fired-failed": "Failed", processing: "Processing", pending: "Pending",
};
const COLOR: Record<DayCard["status"], "success" | "error" | "info" | "default"> = {
  "fired-success": "success", "fired-failed": "error", processing: "info", pending: "default",
};

export default function PlanTab({
  rollup,
  availableProducts,
}: {
  rollup: Rollup[];
  availableProducts: Product[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [firedScheduleId, setFiredScheduleId] = useState<string | null>(null);
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"future" | "past" | "all">("future");
  const [showFilter, setShowFilter] = useState<"all" | "failed">("all");

  if (rollup.length === 0) {
    return <Typography color="text.secondary">No schedules yet.</Typography>;
  }

  // Default view hides days before today (BKK). d.date is already the BKK date.
  const todayBkk = dayjs.utc(Date.now() + 7 * 3600 * 1000).format("YYYY-MM-DD");
  let days = rollup;
  if (dateFilter === "future") days = days.filter(d => d.date >= todayBkk);
  else if (dateFilter === "past") days = days.filter(d => d.date < todayBkk);
  if (showFilter === "failed") {
    days = days
      .filter(d => d.failed > 0)
      .map(d => ({ ...d, cards: d.cards.filter(c => c.status === "fired-failed") }));
  }

  const totals = days.reduce(
    (acc, d) => ({
      scheduled: acc.scheduled + d.scheduled,
      succeeded: acc.succeeded + d.succeeded,
      failed: acc.failed + d.failed,
      pending: acc.pending + d.pending + d.processing,
    }),
    { scheduled: 0, succeeded: 0, failed: 0, pending: 0 },
  );

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Daily schedule</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            select size="small" label="When" value={dateFilter}
            onChange={e => setDateFilter(e.target.value as "future" | "past" | "all")}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="future">Future</MenuItem>
            <MenuItem value="past">Past</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>
          <TextField
            select size="small" label="Show" value={showFilter}
            onChange={e => setShowFilter(e.target.value as "all" | "failed")}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="failed">Only failed</MenuItem>
          </TextField>
        </Stack>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Day</TableCell>
              <TableCell align="right">Scheduled</TableCell>
              <TableCell align="right">Succeeded</TableCell>
              <TableCell align="right">Failed</TableCell>
              <TableCell align="right">Pending</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {days.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No schedules match this filter.</Typography>
                </TableCell>
              </TableRow>
            )}
            {days.map(day => {
              const isExpanded = !!expanded[day.date];
              return (
                <Fragment key={day.date}>
                  <TableRow hover sx={{ cursor: "pointer" }} onClick={() => setExpanded(p => ({ ...p, [day.date]: !p[day.date] }))}>
                    <TableCell padding="checkbox">
                      <IconButton size="small">
                        {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dayjs(day.date).format("ddd, MMM D")}</Typography>
                      <Typography variant="caption" color="text.secondary">{day.date}</Typography>
                    </TableCell>
                    <TableCell align="right">{day.scheduled}</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>{day.succeeded}</TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>{day.failed}</TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>{day.pending + day.processing}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, pl: 6, bgcolor: "var(--app-panel2)" }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Card</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Time (BKK)</TableCell>
                                <TableCell>Planned</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Attempts</TableCell>
                                <TableCell>Order</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {day.cards.map(card => (
                                <ScheduleRow
                                  key={card.scheduleId}
                                  card={card}
                                  dayDate={day.date}
                                  availableProducts={availableProducts}
                                  onOpenAttempts={() => setFiredScheduleId(card.scheduleId)}
                                  onOpenPending={() => setPendingScheduleId(card.scheduleId)}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
            <TableRow sx={{ bgcolor: "var(--app-panel2)" }}>
              <TableCell padding="checkbox" />
              <TableCell><b>Total</b></TableCell>
              <TableCell align="right"><b>{totals.scheduled}</b></TableCell>
              <TableCell align="right" sx={{ color: "success.main" }}><b>{totals.succeeded}</b></TableCell>
              <TableCell align="right" sx={{ color: "error.main" }}><b>{totals.failed}</b></TableCell>
              <TableCell align="right" sx={{ color: "text.secondary" }}><b>{totals.pending}</b></TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <FireAttemptsModal
          open={firedScheduleId !== null}
          scheduleId={firedScheduleId}
          onClose={() => setFiredScheduleId(null)}
        />
        <PendingScheduleModal
          open={pendingScheduleId !== null}
          scheduleId={pendingScheduleId}
          onClose={() => setPendingScheduleId(null)}
        />
      </CardContent>
    </Card>
  );
}

function ScheduleRow({
  card,
  dayDate,
  availableProducts,
  onOpenAttempts,
  onOpenPending,
}: {
  card: DayCard;
  dayDate: string;
  availableProducts: Product[];
  onOpenAttempts: () => void;
  onOpenPending: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Edit-form state
  const [timeStr, setTimeStr] = useState(() =>
    dayjs.utc(card.scheduledFor).format("HH:mm"),
  );
  const [productId, setProductId] = useState(card.plan.product_id);
  const [price, setPrice] = useState(card.plan.price);

  const isPending = card.status === "pending";
  const fired = card.status === "fired-success" || card.status === "fired-failed";

  function rowClick() {
    if (editing || confirming) return;
    if (card.attemptCount > 0) onOpenAttempts();
    else if (isPending) onOpenPending();
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setError(null);
  }
  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
    setTimeStr(dayjs.utc(card.scheduledFor).format("HH:mm"));
    setProductId(card.plan.product_id);
    setPrice(card.plan.price);
    setError(null);
  }
  function saveEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    // Build a new ISO time on the same calendar day in BKK (fake-UTC frame).
    const newIso = new Date(`${dayDate}T${timeStr}:00.000Z`).toISOString();
    startTransition(async () => {
      try {
        await updateSchedule(card.scheduleId, {
          scheduledForIso: newIso,
          productId,
          price,
        });
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }
  function askDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(true);
  }
  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteSchedule(card.scheduleId);
        setConfirming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setConfirming(false);
      }
    });
  }

  if (editing) {
    return (
      <TableRow sx={{ bgcolor: "var(--app-warn-soft)" }}>
        <TableCell>•••• {card.last4}</TableCell>
        <TableCell>{card.name}</TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="time" size="small" value={timeStr}
              onChange={e => setTimeStr(e.target.value)}
              inputProps={{ step: 60 }}
              sx={{ width: 110 }}
            />
          </Stack>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1}>
            <Select
              size="small" value={productId}
              onChange={e => setProductId(String(e.target.value))}
              sx={{ minWidth: 140 }}
            >
              {availableProducts.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
            <TextField
              type="number" size="small" value={price}
              onChange={e => setPrice(Number(e.target.value) || 0)}
              inputProps={{ step: 0.01, min: 0 }}
              sx={{ width: 90 }}
            />
          </Stack>
        </TableCell>
        <TableCell colSpan={3}>
          {error && <Typography variant="caption" color="error">{error}</Typography>}
        </TableCell>
        <TableCell align="right">
          <IconButton size="small" onClick={saveEdit} disabled={pending} color="success">
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={cancelEdit} disabled={pending}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: (card.attemptCount > 0 || isPending) ? "pointer" : "default" }}
        onClick={rowClick}
      >
        <TableCell>•••• {card.last4}</TableCell>
        <TableCell>{card.name}</TableCell>
        <TableCell>{dayjs.utc(card.scheduledFor).format("h:mm A")}</TableCell>
        <TableCell>
          {card.plan.product_name}{" "}
          <span style={{ color: "var(--app-faint)" }}>${card.plan.price.toFixed(2)} · MID {card.plan.cc_gateway_id}</span>
        </TableCell>
        <TableCell>
          <Chip
            label={LABEL[card.status]} size="small" color={COLOR[card.status]}
            variant={card.status === "pending" ? "outlined" : "filled"}
          />
        </TableCell>
        <TableCell>{card.attemptCount > 0 ? `${card.attemptCount}` : "—"}</TableCell>
        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{card.orderId ?? "—"}</TableCell>
        <TableCell align="right">
          {isPending ? (
            <>
              <Tooltip title="Edit time, product, price">
                <IconButton size="small" onClick={startEdit} disabled={pending}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete — card returns to pool">
                <IconButton size="small" onClick={askDelete} disabled={pending} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title={fired ? "Fired — preserves history" : "In flight"}>
              <span>
                <IconButton size="small" disabled>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this schedule?</DialogTitle>
        <DialogContent>
          <Typography>
            Card •••• {card.last4} ({card.name}) will return to the pool and can be
            scheduled again. This row will be removed from the flow.
          </Typography>
          {error && <Typography variant="caption" color="error">{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button>
          <Button onClick={confirmDelete} disabled={pending} color="error" variant="contained">
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
