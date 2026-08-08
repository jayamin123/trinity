"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
  Box, Typography, Alert, LinearProgress, Table, TableHead, TableRow, TableCell,
  TableBody, InputAdornment, IconButton, Checkbox, Menu, MenuItem,
  ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import BoltIcon from "@mui/icons-material/Bolt";
import SellIcon from "@mui/icons-material/Sell";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useMemo, useState } from "react";
import { previewAddSchedule, addCardsToFlow, refreshFlowProducts } from "./actions";
import { type DistributionShape } from "@/lib/schedule";
import { InfoBar, SectionCard } from "@/components/modal-shared";

type Product = { id: string; name: string; price: number };
type PreviewDay = { date: string; count: number };

/** Trailing number in a product name, e.g. "Clq B101" -> 101. */
function productNameNumber(name: string): number | null {
  const m = name.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : null;
}

export default function AddCardsDialog({
  flowId, flowName, availableProducts, poolBalance, poolUnlim, defaultSet, defaultStart, defaultEnd,
  currentMix, gatewayId, campaignName,
}: {
  flowId: string;
  flowName: string;
  availableProducts: Product[];
  poolBalance: number;
  poolUnlim: number;
  defaultSet: "balance" | "unlim";
  defaultStart: string;
  defaultEnd: string;
  currentMix: string; // e.g. "5× Pet Mop Ball, 3× Wall Adaptor"
  gatewayId: string;
  campaignName: string;
}) {
  const [open, setOpen] = useState(false);
  // Which card set to draw from. Defaults to whatever the flow already uses, so
  // an unlimited flow (Slash) defaults to Unlimited and a balance flow to Balance.
  const [cardSet, setCardSet] = useState<"balance" | "unlim">(defaultSet);
  // Available count for the SELECTED set — everything below caps against this.
  const poolCount = cardSet === "unlim" ? poolUnlim : poolBalance;
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
  const [bulkN, setBulkN] = useState(1);
  // Smart filter (left side): pick a field, then filter on it.
  const [filterField, setFilterField] = useState<"product" | "price">("price");
  const [nameOp, setNameOp] = useState<"above" | "below" | "between">("above");
  const [nameA, setNameA] = useState<string>("");
  const [nameB, setNameB] = useState<string>("");
  const [priceValue, setPriceValue] = useState<string>(""); // "" = all prices
  const [rollAnchor, setRollAnchor] = useState<null | HTMLElement>(null);

  function reset() {
    const initial: typeof picks = {};
    for (const p of availableProducts) initial[p.id] = { count: 0, price: p.price };
    setProducts(availableProducts);
    setPicks(initial);
    setSelected(new Set());
    setBulkN(1);
    setFilterField("price");
    setNameOp("above");
    setNameA("");
    setNameB("");
    setPriceValue("");
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

  // Distinct catalog prices for the Price filter.
  const availablePrices = useMemo(
    () => [...new Set(products.map(p => p.price))].sort((a, b) => a - b),
    [products],
  );
  // Products left visible by the smart filter (Field → filter).
  const visibleProducts = useMemo(() => {
    if (filterField === "price") {
      if (priceValue === "") return products;
      const pv = Number(priceValue);
      return products.filter(p => p.price === pv);
    }
    const a = nameA === "" ? null : Number(nameA);
    const b = nameB === "" ? null : Number(nameB);
    return products.filter(p => {
      const n = productNameNumber(p.name);
      if (n === null) return false;
      if (nameOp === "above") return a === null || n > a;
      if (nameOp === "below") return a === null || n < a;
      if (a !== null && n < a) return false;
      if (b !== null && n > b) return false;
      return true;
    });
  }, [products, filterField, priceValue, nameOp, nameA, nameB]);
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

  async function rollPreview(shape: DistributionShape = "even") {
    setRollAnchor(null);
    setError(null);
    if (totalCards <= 0) { setError("Pick at least one card"); return; }
    if (totalCards > poolCount) { setError(`Only ${poolCount} cards in pool`); return; }
    setPreviewLoading(true);
    try {
      const result = await previewAddSchedule(totalCards, startDate, endDate, shape);
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
      await addCardsToFlow({ flowId, productMix, perDay: preview, cardSet });
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
      <Button variant="contained" onClick={() => { setOpen(true); reset(); }} disabled={poolBalance + poolUnlim === 0}>
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
                subtitle: cardSet === "unlim" ? "unlimited available" : "balance available",
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

            {/* Which card set to draw from — prevents pulling UNLIM cards into a
                balance flow (and vice-versa). Defaults to match the flow. */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>
                Pull cards from
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={cardSet}
                onChange={(_, v) => { if (v) { setCardSet(v); setPreview(null); setError(null); } }}
              >
                <ToggleButton value="balance" sx={{ textTransform: "none", px: 2 }}>
                  Remaining balance&nbsp;·&nbsp;<b>{poolBalance.toLocaleString()}</b>
                </ToggleButton>
                <ToggleButton value="unlim" sx={{ textTransform: "none", px: 2 }}>
                  Unlimited&nbsp;·&nbsp;<b>{poolUnlim.toLocaleString()}</b>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

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
              <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {/* LEFT — smart filter: pick a field, then filter on it */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField
                    select size="small" label="Filter" value={filterField}
                    onChange={e => setFilterField(e.target.value as "product" | "price")}
                    sx={{ minWidth: 110 }}
                  >
                    <MenuItem value="product">Product</MenuItem>
                    <MenuItem value="price">Price</MenuItem>
                  </TextField>
                  {filterField === "price" ? (
                    <TextField
                      select size="small" label="Price" value={priceValue}
                      onChange={e => setPriceValue(e.target.value)}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="">All prices</MenuItem>
                      {availablePrices.map(pr => <MenuItem key={pr} value={String(pr)}>${pr.toFixed(2)}</MenuItem>)}
                    </TextField>
                  ) : (
                    <>
                      <TextField
                        select size="small" label="Name #" value={nameOp}
                        onChange={e => setNameOp(e.target.value as "above" | "below" | "between")}
                        sx={{ minWidth: 110 }}
                      >
                        <MenuItem value="above">Above</MenuItem>
                        <MenuItem value="below">Below</MenuItem>
                        <MenuItem value="between">Between</MenuItem>
                      </TextField>
                      <TextField
                        type="number" size="small" label={nameOp === "between" ? "From" : "Value"}
                        value={nameA} onChange={e => setNameA(e.target.value)}
                        sx={{ width: 90 }} inputProps={{ min: 0 }}
                      />
                      {nameOp === "between" && (
                        <TextField
                          type="number" size="small" label="To"
                          value={nameB} onChange={e => setNameB(e.target.value)}
                          sx={{ width: 90 }} inputProps={{ min: 0 }}
                        />
                      )}
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary">{visibleProducts.length} shown</Typography>
                </Stack>

                {/* RIGHT — bulk counts on the checked rows */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">{selected.size} selected</Typography>
                  <TextField
                    type="number" size="small" label="N" value={bulkN}
                    onChange={e => setBulkN(Math.max(0, Number(e.target.value) || 0))}
                    sx={{ width: 72 }} inputProps={{ min: 0 }}
                  />
                  <Button size="small" variant="outlined" disabled={selected.size === 0} onClick={() => applySetTo(bulkN)}>Set {bulkN}</Button>
                  <Button size="small" variant="outlined" disabled={selected.size === 0} onClick={() => applyDistribute(bulkN)}>Distribute {bulkN}</Button>
                  <Button size="small" variant="text" color="inherit" disabled={selected.size === 0} onClick={() => applySetTo(0)}>Clear</Button>
                </Stack>
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
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Button onClick={() => rollPreview("even")} variant="outlined" size="small" disabled={previewLoading || totalCards === 0}>
                    {previewLoading ? "Rolling…" : preview ? "🎲 Reroll" : "Roll"}
                  </Button>
                  <IconButton size="small" onClick={e => setRollAnchor(e.currentTarget)} disabled={previewLoading || totalCards === 0} title="Distribution shape">
                    <ArrowDropDownIcon />
                  </IconButton>
                  <Menu anchorEl={rollAnchor} open={Boolean(rollAnchor)} onClose={() => setRollAnchor(null)}>
                    <MenuItem onClick={() => rollPreview("even")}>Even (roll)</MenuItem>
                    <MenuItem onClick={() => rollPreview("increasing")}>Increasing</MenuItem>
                    <MenuItem onClick={() => rollPreview("decreasing")}>Decreasing</MenuItem>
                    <MenuItem onClick={() => rollPreview("normal")}>Bell curve (heavier middle)</MenuItem>
                    <MenuItem onClick={() => rollPreview("inverse")}>Edges (heavier start + end)</MenuItem>
                  </Menu>
                </Stack>
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
