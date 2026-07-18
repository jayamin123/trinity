"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <div className="topbar"><div><h1>Flows</h1><p>Every campaign and its progress</p></div><div className="spacer" /><Link className="btn primary" href="/flows/new">+ New flow</Link></div>
      <div className="content">
        {!flows ? <div className="loading">Loading…</div> : (
          <div className="grid g2">
            {flows.map((f) => {
              const pct = f.total ? Math.round((f.done / f.total) * 100) : 0;
              return (
                <div key={f.id} className="box clk" onClick={() => router.push(`/flows/${f.id}`)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 650, fontSize: 16, letterSpacing: "-.01em", flex: 1 }}>{f.name}</div>
                    <StatusPill status={f.status} />
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{f.ccGatewayName?.split(" - ")[0] ?? "—"}{f.ccCampaignName ? ` · ${f.ccCampaignName}` : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                    <div className="bar" style={{ flex: 1 }}><i style={{ width: `${pct}%` }} /></div>
                    <span className="num faint" style={{ fontSize: 12 }}>{pct}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12.5 }}>
                    <span className="muted">Total <b className="num" style={{ color: "var(--text)" }}>{f.total}</b></span>
                    <span className="muted">Pending <b className="num" style={{ color: "var(--warn)" }}>{f.pending}</b></span>
                    <span className="muted">Done <b className="num" style={{ color: "var(--good)" }}>{f.success}</b></span>
                    {f.failed > 0 && <span className="muted">Failed <b className="num" style={{ color: "var(--bad)" }}>{f.failed}</b></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
