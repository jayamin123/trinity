"use client";
import { Box, Chip, Stack, Tab, Tabs, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import CardModal from "./CardModal";
dayjs.extend(utc);

export type Status = "pool" | "pending" | "fired";
export type CCVerdict = "success" | "failed" | "cascade";

export type CardRow = {
  id: string;
  last4: string;
  name: string;
  amount: number | "unlim" | null;
  /** Balance consumed by live charges (pending/processing/succeeded). */
  committed: number;
  /** committed exceeds the starting balance. */
  overBalance: boolean;
  source: string;
  status: Status;
  firedAtIso: string | null;
  scheduleId: string | null;
  flowName: string | null;
  ccVerdict: CCVerdict | null;
  plannedMid: string | null;
  actualMid: string | null;
};

export type CardCounts = {
  all: number;
  pool: number;
  pending: number;
  fired: number;
  unlim: number;
  success: number;
  failed: number;
  cascade: number;
};

type TopTab = "all" | "pool" | "pending" | "fired" | "unlim";
type FiredSubTab = "all" | "success" | "failed" | "cascade";

export default function CardsTable({ rows, counts }: { rows: CardRow[]; counts: CardCounts }) {
  const [tab, setTab] = useState<TopTab>("pool");
  const [firedSub, setFiredSub] = useState<FiredSubTab>("success");
  const [amountFilter, setAmountFilter] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "unlim") return rows.filter(r => r.amount === "unlim");
    if (tab === "pool") return rows.filter(r => r.status === "pool");
    if (tab === "pending") return rows.filter(r => r.status === "pending");
    // fired
    const fired = rows.filter(r => r.status === "fired");
    if (firedSub === "success") return fired.filter(r => r.ccVerdict === "success");
    if (firedSub === "failed") return fired.filter(r => r.ccVerdict === "failed");
    if (firedSub === "cascade") return fired.filter(r => r.ccVerdict === "cascade");
    return fired;
  }, [rows, tab, firedSub]);

  // Amount "groups" — a free stand-in for the Pro grid's row grouping. Chips
  // count cards per topup amount in the current tab and filter the grid.
  const amountGroups = useMemo(() => {
    const m = new Map<string, { label: string; count: number; order: number }>();
    for (const r of filtered) {
      const key = amountKey(r.amount);
      const g = m.get(key);
      if (g) g.count++;
      else m.set(key, { label: amountLabel(r.amount), count: 1, order: amountSortValue(r.amount) });
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.order - b.order);
  }, [filtered]);

  const displayed = useMemo(
    () => (amountFilter ? filtered.filter(r => amountKey(r.amount) === amountFilter) : filtered),
    [filtered, amountFilter],
  );

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v as TopTab); setAmountFilter(null); }}
        sx={{ borderBottom: 1, borderColor: "divider", mb: tab === "fired" ? 0 : 2 }}
      >
        <Tab value="pool" label={`Pool (${counts.pool.toLocaleString()})`} />
        <Tab value="pending" label={`Pending (${counts.pending.toLocaleString()})`} />
        <Tab value="fired" label={`Fired (${counts.fired.toLocaleString()})`} />
        <Tab value="unlim" label={`Unlimited (${counts.unlim.toLocaleString()})`} />
        <Tab value="all" label={`All (${counts.all.toLocaleString()})`} sx={{ ml: "auto" }} />
      </Tabs>
      {tab === "fired" && (
        <Tabs
          value={firedSub}
          onChange={(_, v) => setFiredSub(v as FiredSubTab)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{
            borderBottom: 1, borderColor: "divider", mb: 2,
            minHeight: 38,
            "& .MuiTab-root": { minHeight: 38, fontSize: "0.8rem", textTransform: "none" },
          }}
        >
          <Tab value="success" label={`Success (${counts.success.toLocaleString()})`} />
          <Tab value="failed" label={`Failed (${counts.failed.toLocaleString()})`} />
          <Tab value="cascade" label={`Cascade (${counts.cascade.toLocaleString()})`} />
          <Tab value="all" label={`All fired (${counts.fired.toLocaleString()})`} sx={{ ml: "auto" }} />
        </Tabs>
      )}

      {amountGroups.length > 1 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip
            label={`All (${filtered.length.toLocaleString()})`}
            size="small"
            variant={amountFilter === null ? "filled" : "outlined"}
            color={amountFilter === null ? "primary" : "default"}
            onClick={() => setAmountFilter(null)}
          />
          {amountGroups.map(g => (
            <Chip
              key={g.key}
              label={`${g.label} (${g.count.toLocaleString()})`}
              size="small"
              variant={amountFilter === g.key ? "filled" : "outlined"}
              color={amountFilter === g.key ? "primary" : "default"}
              onClick={() => setAmountFilter(amountFilter === g.key ? null : g.key)}
            />
          ))}
        </Stack>
      )}

      <DataGrid
        rows={displayed}
        columns={columns}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
        onRowClick={(p) => setOpenCardId((p.row as CardRow).id)}
        slots={{ toolbar: ExportToolbar }}
        sx={{
          bgcolor: "white",
          "& .MuiDataGrid-row": { cursor: "pointer" },
        }}
      />

      <CardModal
        open={openCardId !== null}
        cardId={openCardId}
        onClose={() => setOpenCardId(null)}
      />
    </>
  );
}

const columns: GridColDef[] = [
  {
    field: "last4",
    headerName: "Card",
    width: 110,
    renderCell: (p) => `•••• ${p.value}`,
  },
  {
    field: "name",
    headerName: "Name",
    flex: 1,
    minWidth: 160,
  },
  {
    field: "amount",
    headerName: "Balance",
    width: 170,
    valueGetter: (_v, row: CardRow) => amountLabel(row.amount),
    sortComparator: (_v1, _v2, p1, p2) =>
      amountSortValue((p1.api.getRow(p1.id) as CardRow).amount) -
      amountSortValue((p2.api.getRow(p2.id) as CardRow).amount),
    renderCell: (p: GridRenderCellParams<CardRow>) => <BalanceCell row={p.row} />,
  },
  {
    field: "source",
    headerName: "Source",
    flex: 1,
    minWidth: 200,
  },
  {
    field: "status",
    headerName: "Status",
    width: 110,
    renderCell: (p: GridRenderCellParams<CardRow>) => <StatusChip row={p.row} />,
  },
  {
    field: "flowName",
    headerName: "Flow",
    flex: 1,
    minWidth: 160,
    valueGetter: (_v, row: CardRow) => row.flowName ?? "—",
  },
  {
    field: "firedAtIso",
    headerName: "Fired",
    width: 180,
    renderCell: (p: GridRenderCellParams<CardRow>) => <FiredCell iso={p.row.firedAtIso} />,
  },
  {
    field: "ccVerdict",
    headerName: "CC verdict",
    width: 170,
    renderCell: (p: GridRenderCellParams<CardRow>) => <VerdictChip row={p.row} />,
  },
];

function amountKey(a: CardRow["amount"]): string {
  if (a === null) return "none";
  if (a === "unlim") return "unlim";
  return a.toFixed(2);
}
function amountLabel(a: CardRow["amount"]): string {
  if (a === null) return "—";
  if (a === "unlim") return "Unlim";
  return `$${a.toFixed(2)}`;
}
/** Sort weight: real amounts ascending, then Unlim, then unknown ("—") last. */
function amountSortValue(a: CardRow["amount"]): number {
  if (a === null) return Number.MAX_SAFE_INTEGER;
  if (a === "unlim") return Number.MAX_SAFE_INTEGER - 1;
  return a;
}
function BalanceCell({ row }: { row: CardRow }) {
  const { amount, committed, overBalance } = row;
  if (amount === "unlim") return <Chip label="Unlim" size="small" color="info" variant="outlined" />;
  if (amount === null) return <Typography variant="body2" color="text.disabled">—</Typography>;
  if (overBalance) return <Chip label={`over by $${(committed - amount).toFixed(2)}`} size="small" color="error" />;
  if (committed <= 1e-9) return <Typography variant="body2">${amount.toFixed(2)}</Typography>;
  const remaining = amount - committed;
  const depleted = remaining <= 1e-9;
  return (
    <Typography variant="body2" sx={{ color: depleted ? "text.disabled" : "inherit" }}>
      ${remaining.toFixed(2)}
      <Box component="span" sx={{ color: "text.disabled" }}> of ${amount.toFixed(2)}</Box>
    </Typography>
  );
}

function StatusChip({ row }: { row: CardRow }) {
  if (row.status === "pool") return <Chip label="Pool" size="small" />;
  if (row.status === "pending") return <Chip label="Pending" size="small" color="warning" />;
  // Fired — colored by verdict
  if (row.ccVerdict === "failed") return <Chip label="Fired" size="small" color="error" />;
  if (row.ccVerdict === "cascade") return <Chip label="Fired" size="small" color="warning" />;
  return <Chip label="Fired" size="small" color="success" />;
}

function VerdictChip({ row }: { row: CardRow }) {
  if (!row.ccVerdict) return <Typography variant="body2" color="text.disabled">—</Typography>;
  if (row.ccVerdict === "success") return <Chip label="Success" size="small" color="success" />;
  if (row.ccVerdict === "failed")  return <Chip label="Failed" size="small" color="error" />;
  const planned = row.plannedMid ?? "—";
  const actual = row.actualMid ?? "—";
  return <Chip label={`Cascade ↪ ${planned}→${actual}`} size="small" color="warning" />;
}

function FiredCell({ iso }: { iso: string | null }) {
  if (!iso) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const t = dayjs.utc(iso);
  return <Typography variant="body2">{t.format("MMM D, h:mm A")}</Typography>;
}

function ExportToolbar() {
  return (
    <GridToolbarContainer sx={{ justifyContent: "flex-end", p: 1 }}>
      <GridToolbarExport
        csvOptions={{ fileName: `cards-${dayjs.utc(new Date(Date.now() + 7 * 3600_000)).format("YYYY-MM-DD")}`, allColumns: true }}
        printOptions={{ disableToolbarButton: true }}
      />
    </GridToolbarContainer>
  );
}
