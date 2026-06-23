"use client";
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { Chip, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import FireAttemptsModal from "./FireAttemptsModal";
dayjs.extend(utc);

type Row = {
  id: string;
  firedAt: string;
  scheduledFor: string;
  cardLast4: string;
  cardName: string;
  planned: string;
  executed: string;
  cascade: boolean;
  success: boolean;
  orderId: string;
  message: string;
};

export default function ActivityTab({ schedules }: { schedules: Array<{
  id: string;
  firedAt: string | null;
  scheduledFor: string;
  orderId: string | null;
  success: boolean;
  cardLast4: string;
  cardName: string;
  firePlan: string;
  fireAttempts: string;
}> }) {
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);

  const rows: Row[] = schedules.map(s => {
    const plan = JSON.parse(s.firePlan) as { product_name: string; price: number; cc_gateway_id: string };
    let attempts: Array<{
      amount_paid: number | null;
      actual_cc_gateway_id: string | null;
      cascade_used: boolean;
      cc_response: { message: string };
    }> = [];
    try { attempts = JSON.parse(s.fireAttempts); } catch { attempts = []; }
    const last = attempts[attempts.length - 1];

    return {
      id: s.id,
      firedAt: s.firedAt ? dayjs.utc(s.firedAt).format("MMM D, h:mm:ss A") : "—",
      scheduledFor: dayjs.utc(s.scheduledFor).format("MMM D, h:mm A"),
      cardLast4: `•••• ${s.cardLast4}`,
      cardName: s.cardName,
      planned: `${plan.product_name} · $${plan.price.toFixed(2)} · MID ${plan.cc_gateway_id}`,
      executed: last
        ? `${last.amount_paid != null ? "$" + last.amount_paid.toFixed(2) : "—"} · MID ${last.actual_cc_gateway_id ?? "—"}`
        : "—",
      cascade: last?.cascade_used ?? false,
      success: s.success,
      orderId: s.orderId ?? "—",
      message: last?.cc_response.message ?? "—",
    };
  });

  const columns: GridColDef[] = [
    { field: "firedAt", headerName: "Fired at (BKK)", width: 180 },
    { field: "cardLast4", headerName: "Card", width: 110 },
    { field: "cardName", headerName: "Name", width: 160 },
    { field: "planned", headerName: "Planned", width: 240 },
    { field: "executed", headerName: "Executed", width: 180 },
    {
      field: "success", headerName: "CC verdict", width: 110,
      renderCell: (p) => <Chip label={p.value ? "Success" : "Failed"} size="small" color={p.value ? "success" : "error"} />,
    },
    {
      field: "cascade", headerName: "Cascade", width: 100,
      renderCell: (p) => p.value ? <Chip label="cascade" size="small" color="warning" variant="outlined" /> : null,
    },
    { field: "orderId", headerName: "Order ID", width: 140 },
    { field: "message", headerName: "CC message", flex: 1, minWidth: 180 },
  ];

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Click a row to see every fire attempt (each CheckoutChamp call, including retries).
        </Typography>
      </Stack>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
        onRowClick={(p) => setOpenScheduleId(p.id as string)}
        slots={{ toolbar: ExportToolbar }}
        sx={{ bgcolor: "white" }}
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
        csvOptions={{ fileName: `flow-activity-${dayjs.utc(new Date(Date.now() + 7 * 3600_000)).format("YYYY-MM-DD")}`, allColumns: true }}
        printOptions={{ disableToolbarButton: true }}
      />
    </GridToolbarContainer>
  );
}
