"use client";
import { useEffect, useMemo, useState } from "react";
import { get } from "@/lib/api";
import { downloadCsv } from "@/lib/csv-export";

export type TxRow = {
  id: string; scheduleId: string; firedAt: string; cardName: string; panLast4: string;
  flowId: string; flowName: string; productName: string | null; price: number | null;
  amountPaid: number | null; plannedMid: string | null; actualMid: string | null;
  cascadeUsed: boolean; success: boolean; orderId: string | null; ccMessage: string | null; retried: boolean;
};

const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");

export default function LogsPage() {
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [verdict, setVerdict] = useState("all");
  const [flow, setFlow] = useState("all");
  const [product, setProduct] = useState("all");
  const [mid, setMid] = useState("all");
  const [cascade, setCascade] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<TxRow | null>(null);
  useEffect(() => { get<TxRow[]>("/api/logs?limit=500").then(setRows).catch(() => setRows([])); }, []);

  const flows = useMemo(() => [...new Map((rows ?? []).map((r) => [r.flowId, r.flowName])).entries()], [rows]);
  const products = useMemo(() => [...new Set((rows ?? []).map((r) => r.productName).filter(Boolean))] as string[], [rows]);
  const mids = useMemo(() => [...new Set((rows ?? []).map((r) => r.actualMid ?? r.plannedMid).filter(Boolean))] as string[], [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (verdict === "all" || (verdict === "ok") === r.success) &&
    (flow === "all" || r.flowId === flow) &&
    (product === "all" || r.productName === product) &&
    (mid === "all" || (r.actualMid ?? r.plannedMid) === mid) &&
    (!cascade || r.cascadeUsed) &&
    (!msg || (r.ccMessage ?? "").toLowerCase().includes(msg.toLowerCase()))
  ), [rows, verdict, flow, product, mid, cascade, msg]);

  const kpi = useMemo(() => {
    const all = rows ?? [];
    const ok = all.filter((r) => r.success).length;
    const volume = all.filter((r) => r.success).reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    // sparkline: charges per day, last ~10 days present in the ledger
    const perDay = new Map<string, number>();
    for (const r of all) { const d = r.firedAt.slice(0, 10); perDay.set(d, (perDay.get(d) ?? 0) + 1); }
    const days = [...perDay.entries()].sort().slice(-10).map(([, n]) => n);
    return { total: all.length, ok, approval: all.length ? (ok / all.length) * 100 : 0, volume, failed: all.length - ok, days };
  }, [rows]);

  return (
    <>
      <div className="topbar"><div><h1>Logs</h1><p>Every charge attempt, permanently — the transactions ledger</p></div></div>
      <div className="content">
        {/* KPI strip */}
        <div className="grid g4" style={{ marginBottom: 18 }}>
          <div className="box kpi">
            <div className="lab">Charges (ledger)</div>
            <div className="val num">{kpi.total.toLocaleString()}</div>
            <Spark days={kpi.days} />
          </div>
          <div className="box kpi">
            <div className="lab">Approval rate</div>
            <div className="val num">{kpi.approval.toFixed(1)}<small>%</small></div>
            <Ring pct={kpi.approval} />
          </div>
          <div className="box kpi">
            <div className="lab">Captured volume</div>
            <div className="val num">${kpi.volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="box kpi">
            <div className="lab">Declined</div>
            <div className="val num" style={{ color: kpi.failed ? "var(--bad)" : "inherit" }}>{kpi.failed}</div>
          </div>
        </div>

        {/* filter bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <div className="seg">
            <button className={verdict === "all" ? "on" : ""} onClick={() => setVerdict("all")}>All <span className="faint">{rows?.length ?? 0}</span></button>
            <button className={verdict === "ok" ? "on" : ""} onClick={() => setVerdict("ok")}>Approved <span className="faint">{kpi.ok}</span></button>
            <button className={verdict === "fail" ? "on" : ""} onClick={() => setVerdict("fail")}>Declined <span className="faint">{kpi.failed}</span></button>
          </div>
          <label className="chip">Flow: <select value={flow} onChange={(e) => setFlow(e.target.value)}><option value="all">All</option>{flows.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="chip">Product: <select value={product} onChange={(e) => setProduct(e.target.value)}><option value="all">All</option>{products.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className="chip">MID: <select value={mid} onChange={(e) => setMid(e.target.value)}><option value="all">All</option>{mids.map((m) => <option key={m} value={m}>MID {m}</option>)}</select></label>
          <label className="chip"><input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} style={{ accentColor: "var(--accent)" }} /> Cascaded</label>
          <input className="input" style={{ width: 150 }} placeholder="CC message…" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button className="chip" onClick={() => downloadCsv("logs.csv", shown.map((r) => ({ time: r.firedAt, card: r.cardName, last4: r.panLast4, flow: r.flowName, product: r.productName, amount: r.amountPaid, mid: r.actualMid ?? r.plannedMid, cascade: r.cascadeUsed, status: r.success ? "approved" : "declined", order: r.orderId, message: r.ccMessage })))}>⬇ Export CSV</button>
          <div className="spacer" /><span className="faint" style={{ fontSize: 12 }}>{shown.length} of {rows?.length ?? 0}</span>
        </div>

        {!rows ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Time</th><th>Card</th><th>Flow</th><th>Product</th><th className="right">Amount</th><th>MID</th><th>Status</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="clk" onClick={() => setOpen(r)}>
                    <td className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmt(r.firedAt)}</td>
                    <td>
                      <div className="cardcell">
                        <span className="cardglyph">CARD</span>
                        <div style={{ minWidth: 0 }}><div className="nm">{r.cardName}</div><div className="pan mono">••{r.panLast4}</div></div>
                      </div>
                    </td>
                    <td className="muted">{r.flowName}</td>
                    <td className="muted">{r.productName ?? "—"}</td>
                    <td className="right mono">{r.amountPaid != null ? `$${r.amountPaid.toFixed(2)}` : "—"}</td>
                    <td><span className="mid-chip">MID {r.actualMid ?? r.plannedMid ?? "?"}</span>{r.cascadeUsed && <span className="pill warn" style={{ marginLeft: 4 }}><span className="dot" />casc</span>}</td>
                    <td className="nowrap">
                      {r.success ? <span className="pill ok"><span className="dot" />Approved</span> : <span className="pill no"><span className="dot" />Declined</span>}
                      {r.retried && <span className="retryflag">RETRY</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <DetailModal row={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Ring({ pct }: { pct: number }) {
  const off = 88 * (1 - Math.min(pct, 100) / 100);
  return (
    <svg className="ring" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="none" stroke="var(--border-strong)" strokeWidth="4" />
      <circle cx="17" cy="17" r="14" fill="none" stroke="var(--good)" strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={off} transform="rotate(-90 17 17)" />
    </svg>
  );
}

function Spark({ days }: { days: number[] }) {
  if (days.length < 2) return null;
  const max = Math.max(...days, 1);
  const pts = days.map((n, i) => `${(i / (days.length - 1)) * 90},${32 - (n / max) * 28}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 90 32" preserveAspectRatio="none" fill="none">
      <polyline points={pts} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="90" cy={32 - (days[days.length - 1] / max) * 28} r="2.4" fill="var(--accent)" />
    </svg>
  );
}

type Attempt = { id: string; firedAt: string; success: boolean; orderId: string | null; actualMid: string | null; plannedMid: string | null; ccMessage: string | null; amountPaid: number | null; rawResponse: string | null };

function DetailModal({ row, onClose }: { row: TxRow; onClose: () => void }) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  useEffect(() => { get<Attempt[]>(`/api/schedules/${row.scheduleId}/attempts`).then(setAttempts).catch(() => setAttempts([])); }, [row.scheduleId]);
  const raw = attempts?.find((a) => a.rawResponse)?.rawResponse;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mh">
          <span className="cardglyph" style={{ width: 42, height: 28, marginTop: 2 }}>CARD</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 660, fontSize: 18, letterSpacing: "-.02em" }}>{row.cardName}</div>
            <div className="muted" style={{ fontSize: 12.5 }}><span className="mono">••{row.panLast4}</span> · {row.flowName}</div>
          </div>
          {row.success ? <span className="pill ok"><span className="dot" />Approved</span> : <span className="pill no"><span className="dot" />Declined</span>}
          {row.retried && <span className="retryflag">RETRY</span>}
          <button className="mclose" onClick={onClose}>✕</button>
        </div>
        <div className="m-meta">
          <div><div className="k">Product</div><div className="v">{row.productName ?? "—"}</div></div>
          <div><div className="k">Amount</div><div className="v mono">{row.amountPaid != null ? `$${row.amountPaid.toFixed(2)}` : "—"}</div></div>
          <div><div className="k">Gateway</div><div className="v mono">MID {row.actualMid ?? row.plannedMid ?? "?"}</div></div>
          <div><div className="k">Order</div><div className="v mono">{row.orderId ?? "—"}</div></div>
          <div><div className="k">Cascade</div><div className="v">{row.cascadeUsed ? "yes" : "no"}</div></div>
          <div><div className="k">Attempts</div><div className="v num">{attempts?.length ?? "…"}</div></div>
        </div>
        <div className="mb">
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-faint)", fontWeight: 650, marginBottom: 14 }}>Attempt history</div>
          <div className="att">
            {(attempts ?? []).map((a, i) => (
              <div key={a.id} className={`step ${a.success ? "pass" : "fail"}`}>
                <span className="node" />
                <div className="top"><span className="verdict">{a.success ? "APPROVED" : "DECLINED"}</span><span className="stamp mono">#{i + 1} · {new Date(a.firedAt).toISOString().slice(0, 19).replace("T", " ")}</span></div>
                <div className="line">{a.ccMessage ?? "—"}</div>
                <div className="tags"><span className="tag mono">MID {a.actualMid ?? a.plannedMid ?? "?"}</span>{a.orderId && <span className="tag mono">order {a.orderId}</span>}{a.amountPaid != null && <span className="tag">${a.amountPaid.toFixed(2)}</span>}</div>
              </div>
            ))}
          </div>
          {raw && <details className="raw"><summary>Raw CheckoutChamp response</summary><pre className="mono">{raw}</pre></details>}
        </div>
      </div>
    </div>
  );
}
