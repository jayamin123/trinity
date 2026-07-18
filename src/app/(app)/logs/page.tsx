"use client";
import { useEffect, useMemo, useState } from "react";
import { get } from "@/lib/api";

export type TxRow = {
  id: string; scheduleId: string; firedAt: string; cardName: string; panLast4: string;
  flowId: string; flowName: string; productName: string | null; price: number | null;
  amountPaid: number | null; plannedMid: string | null; actualMid: string | null;
  cascadeUsed: boolean; success: boolean; orderId: string | null; ccMessage: string | null;
};

export default function LogsPage() {
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [verdict, setVerdict] = useState("all");
  const [flow, setFlow] = useState("all");
  const [openSched, setOpenSched] = useState<string | null>(null);
  useEffect(() => { get<TxRow[]>("/api/logs?limit=500").then(setRows).catch(() => setRows([])); }, []);

  const flows = useMemo(() => [...new Map((rows ?? []).map((r) => [r.flowId, r.flowName])).entries()], [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => {
    if (verdict === "ok" && !r.success) return false;
    if (verdict === "fail" && r.success) return false;
    if (flow !== "all" && r.flowId !== flow) return false;
    return true;
  }), [rows, verdict, flow]);

  return (
    <>
      <div className="topbar"><div><h1>Logs</h1><p>Every charge attempt, permanently — the transactions ledger</p></div></div>
      <div className="content">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <div className="seg">
            <button className={verdict === "all" ? "on" : ""} onClick={() => setVerdict("all")}>All</button>
            <button className={verdict === "ok" ? "on" : ""} onClick={() => setVerdict("ok")}>Approved</button>
            <button className={verdict === "fail" ? "on" : ""} onClick={() => setVerdict("fail")}>Failed</button>
          </div>
          <select className="input" style={{ width: "auto" }} value={flow} onChange={(e) => setFlow(e.target.value)}>
            <option value="all">Flow: All</option>{flows.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <div className="spacer" /><span className="faint" style={{ fontSize: 12 }}>{shown.length} of {rows?.length ?? 0}</span>
        </div>
        {!rows ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Time</th><th>Card</th><th>Flow</th><th>Product</th><th className="right">Amount</th><th>MID</th><th>Status</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="clk" onClick={() => setOpenSched(r.scheduleId)}>
                    <td className="mono" style={{ fontSize: 12 }}>{new Date(r.firedAt).toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td><b>{r.cardName}</b> <span className="faint mono">••{r.panLast4}</span></td>
                    <td className="muted">{r.flowName}</td>
                    <td className="muted">{r.productName ?? "—"}</td>
                    <td className="right mono">{r.amountPaid != null ? `$${r.amountPaid.toFixed(2)}` : "—"}</td>
                    <td><span className="tag mono">MID {r.actualMid ?? r.plannedMid ?? "?"}</span>{r.cascadeUsed && <span className="pill warn" style={{ marginLeft: 4 }}><span className="dot" />casc</span>}</td>
                    <td>{r.success ? <span className="pill ok"><span className="dot" />Approved</span> : <span className="pill no"><span className="dot" />Declined</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {openSched && <AttemptsModal scheduleId={openSched} onClose={() => setOpenSched(null)} />}
    </>
  );
}

type Attempt = { id: string; firedAt: string; success: boolean; orderId: string | null; actualMid: string | null; plannedMid: string | null; ccMessage: string | null; amountPaid: number | null; rawResponse: string | null };

function AttemptsModal({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }) {
  const [items, setItems] = useState<Attempt[] | null>(null);
  useEffect(() => { get<Attempt[]>(`/api/schedules/${scheduleId}/attempts`).then(setItems).catch(() => onClose()); }, [scheduleId, onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mh"><div style={{ flex: 1 }}><div style={{ fontWeight: 660, fontSize: 16 }}>Attempt history</div><div className="faint" style={{ fontSize: 12 }}>{items?.length ?? 0} attempt(s) · nothing is ever hidden by a retry</div></div><button className="mclose" onClick={onClose}>✕</button></div>
        <div className="mb">
          {(items ?? []).map((a, i) => (
            <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`pill ${a.success ? "ok" : "no"}`}><span className="dot" />{a.success ? "APPROVED" : "DECLINED"}</span>
                <span className="faint mono" style={{ fontSize: 12 }}>#{i + 1} · {new Date(a.firedAt).toISOString().slice(0, 19).replace("T", " ")}</span>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{a.ccMessage ?? "—"}</div>
              <div style={{ marginTop: 8 }}>
                <span className="tag mono">MID {a.actualMid ?? a.plannedMid ?? "?"}</span>
                {a.orderId && <span className="tag mono">order {a.orderId}</span>}
                {a.amountPaid != null && <span className="tag">${a.amountPaid.toFixed(2)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
