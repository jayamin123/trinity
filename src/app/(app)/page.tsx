"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@/lib/api";
import { Ring, Spark } from "@/components/charts";
import type { TxRow } from "./logs/page";

type Stats = {
  cards: number; activeFlows: number; flows: number; pending: number;
  totalCharges: number; approvalRate: number; volume: number; declined: number; series: number[];
  byProduct: { name: string; charges: number; volume: number }[];
  byFlow: { name: string; charges: number; ok: number }[];
};

export default function DashboardPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<TxRow[]>([]);
  const [groupBy, setGroupBy] = useState<"product" | "flow">("flow");
  useEffect(() => {
    get<Stats>("/api/dashboard").then(setS).catch(() => {});
    get<TxRow[]>("/api/logs?limit=8").then(setRecent).catch(() => {});
  }, []);

  return (
    <>
      <div className="topbar"><div><h1>Dashboard</h1><p>Trinity Flows · ledger v2 · flows2 (non-firing)</p></div></div>
      <div className="content">
        {!s ? <div className="loading">Loading…</div> : (
          <>
            <div className="grid g4">
              <div className="box kpi"><div className="lab">Total charges</div><div className="val num">{s.totalCharges.toLocaleString()}</div><Spark data={s.series} /></div>
              <div className="box kpi"><div className="lab">Approval rate</div><div className="val num">{s.approvalRate}<small>%</small></div><Ring pct={s.approvalRate} /></div>
              <div className="box kpi"><div className="lab">Captured volume</div><div className="val num">${s.volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
              <div className="box kpi"><div className="lab">Declined</div><div className="val num" style={{ color: s.declined ? "var(--bad)" : "inherit" }}>{s.declined}</div></div>
            </div>
            <div className="grid g4" style={{ marginTop: 14 }}>
              <Link className="box kpi" href="/cards"><div className="lab">Cards in pool</div><div className="val num">{s.cards.toLocaleString()}</div></Link>
              <Link className="box kpi" href="/flows"><div className="lab">Active flows</div><div className="val num">{s.activeFlows}<small> / {s.flows}</small></div></Link>
              <div className="box kpi"><div className="lab">Pending schedules</div><div className="val num">{s.pending.toLocaleString()}</div></div>
              <div className="box kpi"><div className="lab">Firing</div><div className="val" style={{ fontSize: 20, color: "var(--warn)" }}>OFF</div><div className="delta faint">no cron on flows2</div></div>
            </div>

            <h2>Recent activity</h2>
            <div className="panel"><div className="pb" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {recent.map((r) => (
                <Link key={r.id} href="/logs" className="minirow">
                  <span className="cardglyph">CARD</span>
                  <b style={{ minWidth: 140 }}>{r.cardName}</b>
                  <span className="muted" style={{ flex: 1 }}>{r.flowName} · {r.productName}</span>
                  <span className="mono">{r.amountPaid != null ? `$${r.amountPaid.toFixed(2)}` : "—"}</span>
                  {r.success ? <span className="pill ok"><span className="dot" />ok</span> : <span className="pill no"><span className="dot" />fail</span>}
                </Link>
              ))}
              {recent.length === 0 && <div className="faint" style={{ padding: 12 }}>No activity.</div>}
            </div></div>

            <h2>Breakdown <span className="seg" style={{ marginLeft: 8 }}><button className={groupBy === "flow" ? "on" : ""} onClick={() => setGroupBy("flow")}>By flow</button><button className={groupBy === "product" ? "on" : ""} onClick={() => setGroupBy("product")}>By product</button></span></h2>
            <div className="panel scroll">
              <table className="tbl">
                <thead><tr><th>{groupBy === "flow" ? "Flow" : "Product"}</th><th className="right">Charges</th><th className="right">{groupBy === "flow" ? "Approved" : "Volume"}</th></tr></thead>
                <tbody>
                  {groupBy === "flow"
                    ? s.byFlow.map((r) => <tr key={r.name}><td><b>{r.name}</b></td><td className="right num">{r.charges}</td><td className="right num" style={{ color: "var(--good)" }}>{r.ok}</td></tr>)
                    : s.byProduct.map((r) => <tr key={r.name}><td><b>{r.name}</b></td><td className="right num">{r.charges}</td><td className="right num">${r.volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
