"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
  Box, Typography, Alert, LinearProgress, Table, TableHead, TableRow, TableCell,
  TableBody, InputAdornment, IconButton, Checkbox, Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import BoltIcon from "@mui/icons-material/Bolt";
import SellIcon from "@mui/icons-material/Sell";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useMemo, useState } from "react";
import { previewAddSchedule, addCardsToFlow, refreshFlowProducts } from "./actions";
import { InfoBar, SectionCard } from "@/components/modal-shared";

type Product = { id: string; name: string; price: number };
type PreviewDay = { date: string; count: number };

export default function AddCardsDialog({
  flowId, flowName, availableProducts, poolCount, defaultStart, defaultEnd,
  currentMix, gatewayId, campaignName,
}: {
  flowId: string;
  flowName: string;
  availableProducts: Product[];
  poolCount: number;
  defaultStart: string;
  defaultEnd: string;
  currentMix: string; // e.g. "5× Pet Mop Ball, 3× Wall Adaptor"
  gatewayId: string;
  campaignName: string;
}) {
  const [open, setOpen] = useState(false);
  // Seeded from the server prop, but kept in state so the "Refresh from CC"
  // button can update the picker live without reloading the page.
  const [products, setProducts] = useState<Product[]>(availableProducts);
  const [refreshing, setRefreshing] = useState(false);
  const [picks, setPicks] = useState<Record<string, { count: number; price: number }>>({});
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [preview, setPreview] = useState<PreviewDay[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bulk-fill helpers for the product picker.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [bulkN, setBulkN] = useState(1);

  function reset() {
    const initial: typeof picks = {};
    for (const p of availableProducts) initial[p.id] = { count: 0, price: p.price };
    setProducts(availableProducts);
    setPicks(initial);
    setSelected(new Set());
    setPriceFilter(null);
    setBulkN(1);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setPreview(null);
    setError(null);
    setSubmitting(false);
  }

  async function handleRefresh() {
    setError(null);
    setRefreshing(true);
    try {
      const fresh = await refreshFlowProducts(flowId);
      setProducts(fresh);
      // Keep whatever counts the user has typed; pick up the new catalog prices.
      setPicks(prev => {
        const next: typeof prev = {};
        for (const p of fresh) next[p.id] = { count: prev[p.id]?.count ?? 0, price: p.price };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    }
    setRefreshing(false);
  }
  function setCount(id: string, count: number) {
    setPicks(prev => ({ ...prev, [id]: { count: Math.max(0, count | 0), price: prev[id]?.price ?? 0 } }));
  }
  function setPrice(id: string, price: number) {
    setPicks(prev => ({ ...prev, [id]: { count: prev[id]?.count ?? 0, price: Math.max(0, price) } }));
  }

  // Quick-filter products by their catalog price, so you can e.g. select every
  // $5.25 product and fill them in one go.
  const priceGroups = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of products) m.set(p.price, (m.get(p.price) ?? 0) + 1);
    return [...m.entries()].map(([price, n]) => ({ price, n })).sort((a, b) => a.price - b.price);
  }, [products]);
  const visibleProducts = useMemo(
    () => (priceFilter == null ? products : products.filter(p => p.price === priceFilter)),
    [products, priceFilter],
  );
  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every(p => selected.has(p.id));
  const someVisibleSelected = visibleProducts.some(p => selected.has(p.id));

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleSelectAllVisible() {
    setSelected(prev => {
      const n = new Set(prev);
      if (allVisibleSelected) visibleProducts.forEach(p => n.delete(p.id));
      else visibleProducts.forEach(p => n.add(p.id));
      return n;
    });
  }
  // Set every selected product's count to v.
  function applySetTo(v: number) {
    const val = Math.max(0, v | 0);
    setPicks(prev => {
      const next = { ...prev };
      for (const id of selected) next[id] = { count: val, price: next[id]?.price ?? 0 };
      return next;
    });
  }
  // Randomly scatter `total` cards across the selected products (sums to total).
  function applyDistribute(total: number) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const t = Math.max(0, total | 0);
    const counts = new Array(ids.length).fill(0);
    for (let i = 0; i < t; i++) counts[Math.floor(Math.random() * ids.length)]++;
    setPicks(prev => {
      const next = { ...prev };
      ids.forEach((id, i) => { next[id] = { count: counts[i], price: next[id]?.price ?? 0 }; });
      return next;
    });
  }

  const totalCards = useMemo(
    () => Object.values(picks).reduce((s, p) => s + (p.count || 0), 0),
    [picks],
  );

  async function rollPreview() {
    setError(null);
    if (totalCards <= 0) { setError("Pick at least one card"); return; }
    if (totalCards > poolCount) { setError(`Only ${poolCount} cards in pool`); return; }
    setPreviewLoading(true);
    try {
      const result = await previewAddSchedule(totalCards, startDate, endDate);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    }
    setPreviewLoading(false);
  }

  function updateDayCount(date: string, raw: string) {
    if (!preview) return;
    const n = Math.max(0, parseInt(raw, 10) || 0);
    setPreview(preview.map(p => p.date === date ? { ...p, count: n } : p));
  }

  async function handleSubmit() {
    setError(null);
    if (!preview) { setError("Generate a preview first"); return; }
    const previewSum = preview.reduce((s, p) => s + p.count, 0);
    if (previewSum !== totalCards) {
      setError(`Schedule sums to ${previewSum} but mix sums to ${totalCards}`);
      return;
    }
    const productMix = products
      .filter(p => (picks[p.id]?.count ?? 0) > 0)
      .map(p => ({
        product_id: p.id, product_name: p.name,
        price: picks[p.id].price, count: picks[p.id].count,
      }));

    setSubmitting(true);
    try {
      await addCardsToFlow({ flowId, productMix, perDay: preview });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add cards");
      setSubmitting(false);
    }
  }

  const previewSum = preview ? preview.reduce((s, p) => s + p.count, 0) : 0;
  const maxCount = preview ? Math.max(1, ...preview.map(p => p.count)) : 1;

  return (
    <>
      <Button variant="contained" onClick={() => { setOpen(true); reset(); }} disabled={poolCount === 0}>
        Add cards
      </Button>
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Cards</Typography>
            <IconButton size="small" onClick={() => !submitting && setOpen(false)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <InfoBar items={[
              {
                icon: <CreditCardIcon />,
                label: "Pool",
                value: `${poolCount.toLocaleString()} cards`,
                subtitle: "available",
              },
              {
                icon: <BoltIcon />,
                label: "Flow",
                value: flowName,
                subtitle: `Current: ${currentMix || "—"}`,
              },
              {
                icon: <SellIcon />,
                label: "Adding",
                value: `${totalCards} card${totalCards === 1 ? "" : "s"}`,
                subtitle: totalCards === 0 ? "pick products below" : "to be scheduled",
              },
              {
                icon: <BusinessIcon />,
                label: "Routing",
                value: `MID ${gatewayId}`,
                subtitle: campaignName,
              },
            ]} />

            <SectionCard
              title="Pick products"
              icon={<SellIcon />}
              action={
                <Button
                  onClick={handleRefresh}
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  disabled={refreshing || submitting}
                >
                  {refreshing ? "Refreshing…" : "Refresh from CC"}
                </Button>
              }
            >
              {priceGroups.length > 1 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                  <Chip
                    label={`All (${products.length})`} size="small"
                    variant={priceFilter == null ? "filled" : "outlined"}
                    color={priceFilter == null ? "primary" : "default"}
                    onClick={() => setPriceFilter(null)}
                  />
                  {priceGroups.map(g => (
                    <Chip
                      key={g.price} label={`$${g.price.toFixed(2)} (${g.n})`} size="small"
                      variant={priceFilter === g.price ? "filled" : "outlined"}
                      color={priceFilter === g.price ? "primary" : "default"}
                      onClick={() => setPriceFilter(priceFilter === g.price ? null : g.price)}
                    />
                  ))}
                </Stack>
              )}

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 76 }}>{selected.size} selected</Typography>
                <TextField
                  type="number" size="small" label="N" value={bulkN}
                  onChange={e => setBulkN(Math.max(0, Number(e.target.value) || 0))}
                  sx={{ width: 80 }} inputProps={{ min: 0 }}
                />
                <Button size="small" variant="outlined" disabled={selected.size === 0} onClick={() => applySetTo(bulkN)}>Set to {bulkN}</Button>
                <Button size="small" variant="outlined" disabled={selected.size === 0} onClick={() => applyDistribute(bulkN)}>Distribute {bulkN}</Button>
                <Button size="small" variant="text" color="inherit" disabled={selected.size === 0} onClick={() => applySetTo(0)}>Clear</Button>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allVisibleSelected}
                        indeterminate={!allVisibleSelected && someVisibleSelected}
                        onChange={toggleSelectAllVisible}
                      />
                    </TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>Price</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleProducts.map(p => (
                    <TableRow key={p.id} selected={selected.has(p.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                      </TableCell>
                      <TableCell>{p.name} <span style={{ color: "#888" }}>#{p.id}</span></TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number" size="small"
                          value={picks[p.id]?.price ?? p.price}
                          onChange={e => setPrice(p.id, Number(e.target.value) || 0)}
                          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                          inputProps={{ step: 0.01, min: 0, style: { textAlign: "right" } }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number" size="small"
                          value={picks[p.id]?.count ?? 0}
                          onChange={e => setCount(p.id, Number(e.target.value) || 0)}
                          inputProps={{ min: 0, max: poolCount, style: { textAlign: "right" } }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <TableCell colSpan={2}><b>Total to add</b></TableCell>
                    <TableCell />
                    <TableCell align="right"><b>{totalCards}</b></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </SectionCard>

            <SectionCard title="Date window (BKK)" icon={<CalendarTodayIcon />}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
                <TextField label="End" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
              </Stack>
            </SectionCard>

            <SectionCard
              title="Preview"
              icon={<BarChartIcon />}
              action={
                <Button onClick={rollPreview} variant="outlined" size="small" disabled={previewLoading || totalCards === 0}>
                  {previewLoading ? "Generating…" : preview ? "🎲 Reroll" : "Generate preview"}
                </Button>
              }
            >
              {previewLoading && <LinearProgress sx={{ mt: 1 }} />}
              {preview && (
                <Box sx={{ bgcolor: "#fafafa", p: 2, borderRadius: 1, maxHeight: 320, overflow: "auto" }}>
                  {preview.map(p => (
                    <Stack key={p.date} direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ width: 110, fontFamily: "monospace" }}>{p.date}</Typography>
                      <Box sx={{ flexGrow: 1, height: 16, bgcolor: "#e0e0e0", borderRadius: 0.5, overflow: "hidden" }}>
                        <Box sx={{ width: `${(p.count / maxCount) * 100}%`, height: "100%", bgcolor: "primary.main", transition: "width 120ms" }} />
                      </Box>
                      <TextField
                        type="number" value={p.count}
                        onChange={e => updateDayCount(p.date, e.target.value)}
                        size="small" sx={{ width: 80 }}
                        inputProps={{ min: 0, style: { textAlign: "right" } }}
                      />
                    </Stack>
                  ))}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Total to add: <b>{previewSum}</b>. Cards fire at randomized times between 5 PM and 1 PM next day BKK.
                  </Typography>
                </Box>
              )}
              {!preview && !previewLoading && (
                <Typography variant="caption" color="text.secondary">
                  Click Generate to see the daily distribution.
                </Typography>
              )}
            </SectionCard>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setOpen(false); reset(); }} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || !preview || previewSum === 0}>
            {submitting ? "Adding…" : `Add ${previewSum || 0} card${previewSum === 1 ? "" : "s"}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
