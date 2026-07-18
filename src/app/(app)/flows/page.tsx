"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";

type FlowRow = {
  id: string; name: string; status: string; ccGatewayName: string | null; ccCampaignName: string | null;
  total: number; pending: number; done: number; success: number; failed: number;
};

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowRow[] | null>(null);
  const router = useRouter();
  useEffect(() => { get<FlowRow[]>("/api/flows").then(setFlows).catch(() => setFlows([])); }, []);

  return (
    <>
      <div className="topbar"><div><h1>Flows</h1><p>Every campaign and its progress</p></div></div>
      <div className="content">
        {!flows ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Flow</th><th>Gateway / Campaign</th><th className="center">Total</th><th className="center">Pending</th><th className="center">Done</th><th className="center">Success</th><th className="center">Failed</th><th>Status</th></tr></thead>
              <tbody>
                {flows.map((f) => (
                  <tr key={f.id} className="clk" onClick={() => router.push(`/flows/${f.id}`)}>
                    <td><b>{f.name}</b></td>
                    <td className="muted">{f.ccGatewayName?.split(" - ")[0] ?? "—"}{f.ccCampaignName ? ` · ${f.ccCampaignName}` : ""}</td>
                    <td className="center num">{f.total}</td>
                    <td className="center num">{f.pending}</td>
                    <td className="center num">{f.done}</td>
                    <td className="center num" style={{ color: "var(--good)" }}>{f.success}</td>
                    <td className="center num" style={{ color: f.failed ? "var(--bad)" : "inherit" }}>{f.failed}</td>
                    <td><StatusPill status={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

