"use client";
import { Box, Chip, Tab, Tabs, Typography } from "@mui/material";
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
type FiredSubTab = "all" | "success" | "failed" | "cascade";

export default function CardsTable({ rows, counts }: { rows: CardRow[]; counts: CardCounts }) {
  const [tab, setTab] = useState<TopTab>("pool");
  const [firedSub, setFiredSub] = useState<FiredSubTab>("success");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "pool") return rows.filter(r => r.status === "pool");
    if (tab === "pending") return rows.filter(r => r.status === "pending");
    // fired
    const fired = rows.filter(r => r.status === "fired");
    if (firedSub === "success") return fired.filter(r => r.ccVerdict === "success");
    if (firedSub === "failed") return fired.filter(r => r.ccVerdict === "failed");
    if (firedSub === "cascade") return fired.filter(r => r.ccVerdict === "cascade");
    return fired;
  }, [rows, tab, firedSub]);

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as TopTab)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: tab === "fired" ? 0 : 2 }}
      >
        <Tab value="pool" label={`Pool (${counts.pool.toLocaleString()})`} />
        <Tab value="pending" label={`Pending (${counts.pending.toLocaleString()})`} />
        <Tab value="fired" label={`Fired (${counts.fired.toLocaleString()})`} />
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

      <DataGrid
        rows={filtered}
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
