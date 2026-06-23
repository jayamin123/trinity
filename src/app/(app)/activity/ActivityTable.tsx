"use client";
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { Chip } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

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

export default function ActivityTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
      pageSizeOptions={[25, 50, 100]}
      disableRowSelectionOnClick
      slots={{ toolbar: ExportToolbar }}
      sx={{ bgcolor: "white" }}
    />
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
