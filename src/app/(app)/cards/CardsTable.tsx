"use client";
import { Box, Chip, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
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
  success: number;
  failed: number;
  cascade: number;
};

type TopTab = "all" | "pool" | "pending" | "fired";
type BalanceFilter = "all" | "unlim" | "numbered";
type VerdictFilter = "all" | "success" | "failed" | "cascade";

export default function CardsTable({ rows, counts }: { rows: CardRow[]; counts: CardCounts }) {
  const [tab, setTab] = useState<TopTab>("pool");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [flowFilter, setFlowFilter] = useState<string>("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Switching status tabs clears the dropdown filters (each tab starts fresh).
  function changeTab(next: TopTab) {
    setTab(next);
    setBalanceFilter("all");
    setSourceFilter("");
    setFlowFilter("");
    setVerdictFilter("all");
  }

  // Rows for the active status tab, before the dropdown filters.
  const base = useMemo(
    () => (tab === "all" ? rows : rows.filter(r => r.status === tab)),
    [rows, tab],
  );

  // Dropdown option lists, derived from the current tab's rows.
  const sourceOptions = useMemo(
    () => [...new Set(base.map(r => r.source).filter(Boolean))].sort(),
    [base],
  );
  const flowOptions = useMemo(
    () => [...new Set(base.map(r => r.flowName).filter((f): f is string => !!f))].sort(),
    [base],
  );

  const displayed = useMemo(() => base.filter(r => {
    if (balanceFilter === "unlim" && r.amount !== "unlim") return false;
    if (balanceFilter === "numbered" && typeof r.amount !== "number") return false;
    if (sourceFilter && r.source !== sourceFilter) return false;
    if (tab === "fired") {
      if (flowFilter && r.flowName !== flowFilter) return false;
      if (verdictFilter !== "all" && r.ccVerdict !== verdictFilter) return false;
    }
    return true;
  }), [base, balanceFilter, sourceFilter, flowFilter, verdictFilter, tab]);

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, v) => changeTab(v as TopTab)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        <Tab value="pool" label={`Pool (${counts.pool.toLocaleString()})`} />
        <Tab value="pending" label={`Pending (${counts.pending.toLocaleString()})`} />
        <Tab value="fired" label={`Fired (${counts.fired.toLocaleString()})`} />
        <Tab value="all" label={`All (${counts.all.toLocaleString()})`} sx={{ ml: "auto" }} />
      </Tabs>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Balance" value={balanceFilter}
          onChange={e => setBalanceFilter(e.target.value as BalanceFilter)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="unlim">Unlimited</MenuItem>
          <MenuItem value="numbered">Has a balance</MenuItem>
        </TextField>
        <TextField
          select size="small" label="Source" value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          sx={{ minWidth: 220, maxWidth: 340 }}
        >
          <MenuItem value="">All sources</MenuItem>
          {sourceOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        {tab === "fired" && (
          <>
            <TextField
              select size="small" label="Flow" value={flowFilter}
              onChange={e => setFlowFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All flows</MenuItem>
              {flowOptions.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="CC verdict" value={verdictFilter}
              onChange={e => setVerdictFilter(e.target.value as VerdictFilter)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cascade">Cascade</MenuItem>
            </TextField>
          </>
        )}
      </Stack>

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
