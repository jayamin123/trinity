"use client";
import {
  TextField, MenuItem, Button, Stack, Box, Typography, Divider, Alert, LinearProgress, InputAdornment, Table, TableHead, TableRow, TableCell, TableBody,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { createFlow, previewSchedule, listFlowGateways, listFlowCampaigns, listFlowProducts } from "./actions";
import type { CCProduct } from "@/lib/flows";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { nowBkk } from "@/lib/bkk";
dayjs.extend(utc);

export type FlowSource = {
  flowId: string;
  flowName: string;
  ccGateway: { id: string; name: string };
  ccCampaign: { id: string; name: string };
  ccProducts: CCProduct[];
};

type Opt = { id: string; name: string };
type CatalogProduct = { id: string; name: string; price: number };
type ProductPick = { count: number; price: number };
type PreviewDay = { date: string; count: number };

const today = dayjs.utc(nowBkk()).format("YYYY-MM-DD");
const inSevenDays = dayjs.utc(nowBkk()).add(7, "day").format("YYYY-MM-DD");

export default function NewFlowForm({ sources, poolCount }: { sources: FlowSource[]; poolCount: number }) {
  const [name, setName] = useState("");
  const [sourceFlowId, setSourceFlowId] = useState("");

  // CC option lists, fetched live from CheckoutChamp.
  const [gateways, setGateways] = useState<Opt[]>([]);
  const [campaigns, setCampaigns] = useState<Opt[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Current selection — every field is editable whether or not we duplicated.
  const [gateway, setGateway] = useState<Opt | null>(null);
  const [campaign, setCampaign] = useState<Opt | null>(null);
  const [picks, setPicks] = useState<Record<string, ProductPick>>({});

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(inSevenDays);
  const [preview, setPreview] = useState<PreviewDay[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load gateways + campaigns once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [g, c] = await Promise.all([listFlowGateways(), listFlowCampaigns()]);
        if (!alive) return;
        setGateways(g);
        setCampaigns(c);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load CheckoutChamp options");
      } finally {
        if (alive) setLoadingOptions(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load a campaign's product catalog. Returns it so callers can prefill picks.
  async function loadProducts(campaignId: string): Promise<CatalogProduct[]> {
    setLoadingProducts(true);
    try {
      const list = await listFlowProducts(campaignId);
      setProducts(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
      setProducts([]);
      return [];
    } finally {
      setLoadingProducts(false);
    }
  }

  // Duplicate from a previous flow: prefill gateway + campaign + products, all editable.
  async function onDuplicateChange(id: string) {
    setSourceFlowId(id);
    setError(null);
    setPreview(null);
    const src = sources.find(s => s.flowId === id);
    if (!src) {
      setGateway(null); setCampaign(null); setProducts([]); setPicks({});
      return;
    }
    setGateway(src.ccGateway);
    setCampaign(src.ccCampaign);
    const catalog = await loadProducts(src.ccCampaign.id);
    // Prefill counts/prices from the source where the product id is still in the campaign.
    const initial: Record<string, ProductPick> = {};
    for (const p of catalog) {
      const fromSrc = src.ccProducts.find(sp => sp.id === p.id);
      initial[p.id] = { count: fromSrc?.count ?? 0, price: fromSrc?.price ?? p.price };
    }
    setPicks(initial);
  }

  function onGatewayChange(id: string) {
    setSourceFlowId("");
    setGateway(gateways.find(g => g.id === id) ?? null);
  }

  // Changing the campaign invalidates the product selection — clear and reload.
  async function onCampaignChange(id: string) {
    setSourceFlowId("");
    setPreview(null);
    const c = campaigns.find(x => x.id === id) ?? null;
    setCampaign(c);
    setPicks({});
    setProducts([]);
    if (c) {
      const catalog = await loadProducts(c.id);
      const initial: Record<string, ProductPick> = {};
      for (const p of catalog) initial[p.id] = { count: 0, price: p.price };
      setPicks(initial);
    }
  }

  function setCount(id: string, count: number) {
    setPicks(prev => ({ ...prev, [id]: { count: Math.max(0, count | 0), price: prev[id]?.price ?? 0 } }));
  }
  function setPrice(id: string, price: number) {
    setPicks(prev => ({ ...prev, [id]: { count: prev[id]?.count ?? 0, price: Math.max(0, price) } }));
  }

  const totalCards = useMemo(
    () => Object.values(picks).reduce((s, p) => s + (p.count || 0), 0),
    [picks],
  );

  async function rollPreview() {
    setError(null);
    if (totalCards <= 0) { setError("Pick at least one card"); return; }
    if (totalCards > poolCount) { setError(`Only ${poolCount} cards in the pool`); return; }
    setPreviewLoading(true);
    try {
      const result = await previewSchedule(totalCards, startDate, endDate);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gateway) { setError("Pick a gateway (MID)"); return; }
    if (!campaign) { setError("Pick a campaign"); return; }
    const productMix = products
      .filter(p => (picks[p.id]?.count ?? 0) > 0)
      .map(p => ({
        product_id: p.id,
        product_name: p.name,
        price: picks[p.id].price,
        count: picks[p.id].count,
      }));
    if (productMix.length === 0) { setError("Pick at least one product"); return; }
    if (!preview) { setError("Generate a schedule preview first"); return; }
    const previewSum = preview.reduce((s, p) => s + p.count, 0);
    if (previewSum !== totalCards) {
      setError(`Schedule sums to ${previewSum} but mix needs ${totalCards}`);
      return;
    }

    setSubmitting(true);
    try {
      await createFlow({
        name: name.trim() || `Flow ${dayjs.utc(nowBkk()).format("MMM D")}`,
        ccGateway: gateway,
        ccCampaign: campaign,
        productMix,
        perDay: preview,
      });
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
      setError(err instanceof Error ? err.message : "Failed to create flow");
      setSubmitting(false);
    }
  }

  const previewSum = preview ? preview.reduce((s, p) => s + p.count, 0) : 0;
  const previewDiff = previewSum - totalCards;
  const maxCount = preview ? Math.max(1, ...preview.map(p => p.count)) : 1;

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        <TextField label="Flow name" value={name} onChange={e => setName(e.target.value)} fullWidth autoFocus placeholder="e.g. Apollo June rotation" />

        {sources.length > 0 && (
          <TextField
            select label="Duplicate from (optional)" value={sourceFlowId}
            onChange={e => onDuplicateChange(e.target.value)} fullWidth
            helperText="Prefills gateway, campaign, and products from a previous flow — all still editable below."
          >
            <MenuItem value="">Start from scratch</MenuItem>
            {sources.map(s => (
              <MenuItem key={s.flowId} value={s.flowId}>
                {s.flowName}
                <span style={{ color: "#888", marginLeft: 8 }}>· {s.ccCampaign.name} · MID {s.ccGateway.id}</span>
              </MenuItem>
            ))}
          </TextField>
        )}

        <Divider />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select label="Gateway (MID)" value={gateway?.id ?? ""}
            onChange={e => onGatewayChange(e.target.value)} required fullWidth
            disabled={loadingOptions}
            helperText={loadingOptions ? "Loading gateways…" : " "}
          >
            {gateways.map(g => (
              <MenuItem key={g.id} value={g.id}>{g.name} <span style={{ color: "#888", marginLeft: 6 }}>· MID {g.id}</span></MenuItem>
            ))}
          </TextField>
          <TextField
            select label="Campaign" value={campaign?.id ?? ""}
            onChange={e => onCampaignChange(e.target.value)} required fullWidth
            disabled={loadingOptions}
            helperText={loadingOptions ? "Loading campaigns…" : "Changing this resets the product selection."}
          >
            {campaigns.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name} <span style={{ color: "#888", marginLeft: 6 }}>· #{c.id}</span></MenuItem>
            ))}
          </TextField>
        </Stack>

        {campaign && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Products</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              From campaign <b>{campaign.name}</b>. For each product, how many cards should fire it?
            </Typography>
            {loadingProducts && <LinearProgress sx={{ mb: 1 }} />}
            {!loadingProducts && products.length === 0 && (
              <Typography variant="body2" color="text.secondary">No products found for this campaign.</Typography>
            )}
            {products.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>Price</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name} <span style={{ color: "#888" }}>(#{p.id})</span></TableCell>
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
                    <TableCell><b>Total</b></TableCell>
                    <TableCell />
                    <TableCell align="right"><b>{totalCards}</b></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
            <Typography variant="caption" color="text.secondary">
              {poolCount.toLocaleString()} cards available in pool.
            </Typography>
          </Box>
        )}

        <Divider />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Start date (BKK)" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="End date (BKK)" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required fullWidth InputLabelProps={{ shrink: true }} />
        </Stack>

        <Box>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="h6">Schedule preview</Typography>
            <Button onClick={rollPreview} variant="outlined" size="small" disabled={previewLoading || totalCards === 0}>
              {previewLoading ? "Generating…" : preview ? "🎲 Reroll" : "Generate preview"}
            </Button>
            {preview && (
              <Box sx={{ ml: "auto" }}>
                <Typography variant="body2" component="span" sx={{ mr: 1 }}>Total:</Typography>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ fontWeight: 600, color: previewDiff === 0 ? "success.main" : "warning.main" }}
                >
                  {previewSum} / {totalCards}
                </Typography>
              </Box>
            )}
          </Stack>
          {previewLoading && <LinearProgress />}
          {preview && (
            <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 1 }}>
              {preview.map(p => (
                <Stack key={p.date} direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ width: 110, fontFamily: "monospace" }}>{p.date}</Typography>
                  <Box sx={{ flexGrow: 1, height: 16, bgcolor: "#e0e0e0", borderRadius: 0.5, overflow: "hidden" }}>
                    <Box sx={{ width: `${(p.count / maxCount) * 100}%`, height: "100%", bgcolor: "primary.main", transition: "width 120ms" }} />
                  </Box>
                  <TextField
                    type="number"
                    value={p.count}
                    onChange={e => updateDayCount(p.date, e.target.value)}
                    size="small"
                    sx={{ width: 80 }}
                    inputProps={{ min: 0, style: { textAlign: "right" } }}
                  />
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Edit any day to redistribute. Each day fires at randomized times between 5 PM and 1 PM next day BKK.
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        <Stack direction="row" spacing={2}>
          <Button
            type="submit" variant="contained" size="large"
            disabled={submitting || !gateway || !campaign || totalCards === 0 || !preview || previewDiff !== 0}
          >
            {submitting ? "Creating…" : "Create flow"}
          </Button>
          <Button component="a" href="/flows" variant="text">Cancel</Button>
        </Stack>
      </Stack>
    </form>
  );
}
