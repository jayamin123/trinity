"use client";
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { Chip, MenuItem, Stack, TextField } from "@mui/material";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import FireAttemptsModal from "../flows/[id]/FireAttemptsModal";
dayjs.extend(utc);

export type ActivityRow = {
  id: string;
  when: string;
  flow: string;
  card: string;
  planned: string;
  executed: string;
  executedProduct: string;
  amountPaid: number | null;
  actualMid: string | null;
  cascade: boolean;
  success: boolean;
  message: string;
  orderId: string;
};

const columns: GridColDef[] = [
  { field: "when", headerName: "Fired at (BKK)", width: 170 },
  { field: "flow", headerName: "Flow", flex: 1, minWidth: 180 },
  { field: "card", headerName: "Card", width: 110 },
  { field: "planned", headerName: "Planned", width: 240 },
  { field: "executed", headerName: "Executed", width: 180 },
  {
    field: "success", headerName: "CC verdict", width: 110,
    renderCell: (p) => <Chip size="small" label={p.value ? "Success" : "Failed"} color={p.value ? "success" : "error"} />,
  },
  {
    field: "cascade", headerName: "Cascade", width: 100,
    renderCell: (p) => p.value ? <Chip label="cascade" size="small" color="warning" variant="outlined" /> : null,
  },
  { field: "orderId", headerName: "Order ID", width: 140 },
  { field: "message", headerName: "CC message", flex: 1, minWidth: 180 },
];

const amountLabel = (a: number | null) => (a === null ? "—" : `$${a.toFixed(2)}`);

export default function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);
  const [flowFilter, setFlowFilter] = useState("");
  const [amountFilter, setAmountFilter] = useState("");   // "" all · "none" · stringified number
  const [midFilter, setMidFilter] = useState("");
  const [cascadeFilter, setCascadeFilter] = useState<"all" | "yes" | "no">("all");
  const [messageFilter, setMessageFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const flows = useMemo(() => [...new Set(rows.map(r => r.flow).filter(Boolean))].sort(), [rows]);
  const products = useMemo(() => [...new Set(rows.map(r => r.executedProduct).filter(Boolean))].sort(), [rows]);
  const amounts = useMemo(() => [...new Set(rows.map(r => r.amountPaid))].sort((a, b) => (a ?? -1) - (b ?? -1)), [rows]);
  const mids = useMemo(() => [...new Set(rows.map(r => r.actualMid ?? "—"))].sort(), [rows]);
  const messages = useMemo(() => [...new Set(rows.map(r => r.message).filter(Boolean))].sort(), [rows]);

  const displayed = useMemo(() => rows.filter(r => {
    if (flowFilter && r.flow !== flowFilter) return false;
    if (amountFilter === "none" ? r.amountPaid !== null : (amountFilter && r.amountPaid !== Number(amountFilter))) return false;
    if (midFilter && (r.actualMid ?? "—") !== midFilter) return false;
    if (cascadeFilter === "yes" && !r.cascade) return false;
    if (cascadeFilter === "no" && r.cascade) return false;
    if (messageFilter && r.message !== messageFilter) return false;
    if (productFilter && r.executedProduct !== productFilter) return false;
    return true;
  }), [rows, flowFilter, amountFilter, midFilter, cascadeFilter, messageFilter, productFilter]);

  return (
    <>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField select size="small" label="Flow" value={flowFilter} onChange={e => setFlowFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All flows</MenuItem>
          {flows.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Product" value={productFilter} onChange={e => setProductFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All products</MenuItem>
          {products.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Amount" value={amountFilter} onChange={e => setAmountFilter(e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          {amounts.map(a => <MenuItem key={String(a)} value={a === null ? "none" : String(a)}>{amountLabel(a)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="MID" value={midFilter} onChange={e => setMidFilter(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">All</MenuItem>
          {mids.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Cascade" value={cascadeFilter} onChange={e => setCascadeFilter(e.target.value as "all" | "yes" | "no")} sx={{ minWidth: 140 }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="yes">Cascaded</MenuItem>
          <MenuItem value="no">Not cascaded</MenuItem>
        </TextField>
        <TextField select size="small" label="CC message" value={messageFilter} onChange={e => setMessageFilter(e.target.value)} sx={{ minWidth: 220, maxWidth: 360 }}>
          <MenuItem value="">All messages</MenuItem>
          {messages.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
      </Stack>

      <DataGrid
        rows={displayed}
        columns={columns}
        initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
        onRowClick={(p) => setOpenScheduleId(p.id as string)}
        slots={{ toolbar: ExportToolbar }}
        sx={{ bgcolor: "white", "& .MuiDataGrid-row": { cursor: "pointer" } }}
      />
      <FireAttemptsModal
        open={openScheduleId !== null}
        scheduleId={openScheduleId}
        onClose={() => setOpenScheduleId(null)}
      />
    </>
  );
}

function ExportToolbar() {
  return (
    <GridToolbarContainer sx={{ justifyContent: "flex-end", p: 1 }}>
      <GridToolbarExport
        csvOptions={{ fileName: `activity-${dayjs.utc(new Date(Date.now() + 7 * 3600_000)).format("YYYY-MM-DD")}`, allColumns: true }}
        printOptions={{ disableToolbarButton: true }}
      />
    </GridToolbarContainer>
  );
}
