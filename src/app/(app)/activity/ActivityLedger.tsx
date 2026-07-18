"use client";
import { useMemo, useState } from "react";

export type LedgerRow = {
  id: string; scheduleId: string; firedAt: string; cardName: string; last4: string; flowName: string;
  productName: string | null; price: number | null; amountPaid: number | null; plannedMid: string | null;
  actualMid: string | null; cascade: boolean; success: boolean; orderId: string | null; message: string | null;
  rawResponse: string | null; attemptIndex: number; retried: boolean;
};

const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
const fmtLong = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace("T", " ");

export default function ActivityLedger({ rows }: { rows: LedgerRow[] }) {
  const [verdict, setVerdict] = useState("all");
  const [flow, setFlow] = useState("all");
  const [product, setProduct] = useState("all");
  const [mid, setMid] = useState("all");
  const [cascade, setCascade] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<LedgerRow | null>(null);

  const flows = useMemo(() => [...new Set(rows.map((r) => r.flowName))].sort(), [rows]);
  const products = useMemo(() => [...new Set(rows.map((r) => r.productName).filter(Boolean))].sort() as string[], [rows]);
  const mids = useMemo(() => [...new Set(rows.map((r) => r.actualMid ?? r.plannedMid).filter(Boolean))].sort() as string[], [rows]);

  const shown = useMemo(() => rows.filter((r) =>
    (verdict === "all" || (verdict === "ok") === r.success) &&
    (flow === "all" || r.flowName === flow) &&
    (product === "all" || r.productName === product) &&
    (mid === "all" || (r.actualMid ?? r.plannedMid) === mid) &&
    (!cascade || r.cascade) &&
    (!msg || (r.message ?? "").toLowerCase().includes(msg.toLowerCase()))
  ), [rows, verdict, flow, product, mid, cascade, msg]);

  const kpi = useMemo(() => {
    const ok = rows.filter((r) => r.success).length;
    const volume = rows.filter((r) => r.success).reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const perDay = new Map<string, number>();
    for (const r of rows) { const d = r.firedAt.slice(0, 10); perDay.set(d, (perDay.get(d) ?? 0) + 1); }
    const days = [...perDay.entries()].sort().slice(-12).map(([, n]) => n);
    return { total: rows.length, ok, approval: rows.length ? (ok / rows.length) * 100 : 0, volume, declined: rows.length - ok, days };
  }, [rows]);

  const attempts = useMemo(() => {
    if (!open) return [];
    return rows.filter((r) => r.scheduleId === open.scheduleId).sort((a, b) => a.attemptIndex - b.attemptIndex);
  }, [open, rows]);
  const raw = attempts.find((a) => a.rawResponse)?.rawResponse;

  return (
    <div className="lgroot">
      <style>{STYLES}</style>
      <div className="lg-head">
        <div><h1>Activity</h1><p>Every charge attempt, permanently — the transactions ledger</p></div>
      </div>

      <div className="lg-kpis">
        <div className="lg-box"><div className="lg-lab">Charges (ledger)</div><div className="lg-val">{kpi.total.toLocaleString()}</div><Spark days={kpi.days} /></div>
        <div className="lg-box"><div className="lg-lab">Approval rate</div><div className="lg-val">{kpi.approval.toFixed(1)}<small>%</small></div><Ring pct={kpi.approval} /></div>
        <div className="lg-box"><div className="lg-lab">Captured volume</div><div className="lg-val">${kpi.volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        <div className="lg-box"><div className="lg-lab">Declined</div><div className="lg-val" style={{ color: kpi.declined ? "var(--lg-bad)" : "inherit" }}>{kpi.declined}</div></div>
      </div>

      <div className="lg-filters">
        <div className="lg-seg">
          <button className={verdict === "all" ? "on" : ""} onClick={() => setVerdict("all")}>All <span>{rows.length}</span></button>
          <button className={verdict === "ok" ? "on" : ""} onClick={() => setVerdict("ok")}>Approved <span>{kpi.ok}</span></button>
          <button className={verdict === "fail" ? "on" : ""} onClick={() => setVerdict("fail")}>Declined <span>{kpi.declined}</span></button>
        </div>
        <label className="lg-chip">Flow <select value={flow} onChange={(e) => setFlow(e.target.value)}><option value="all">All</option>{flows.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
        <label className="lg-chip">Product <select value={product} onChange={(e) => setProduct(e.target.value)}><option value="all">All</option>{products.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className="lg-chip">MID <select value={mid} onChange={(e) => setMid(e.target.value)}><option value="all">All</option>{mids.map((m) => <option key={m} value={m}>MID {m}</option>)}</select></label>
        <label className="lg-chip"><input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} /> Cascaded</label>
        <input className="lg-input" placeholder="CC message…" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <div style={{ flex: 1 }} />
        <span className="lg-faint">{shown.length} of {rows.length}</span>
      </div>

      <div className="lg-panel">
        <div className="lg-scroll">
          <table className="lg-tbl">
            <thead><tr><th>Time</th><th>Card</th><th>Flow</th><th>Product</th><th className="r">Amount</th><th>MID</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r)}>
                  <td className="mono t">{fmt(r.firedAt)}</td>
                  <td><div className="lg-card"><span className="lg-glyph">CARD</span><div><div className="nm">{r.cardName}</div><div className="pan mono">••{r.last4}</div></div></div></td>
                  <td className="mut">{r.flowName}</td>
                  <td className="mut">{r.productName ?? "—"}</td>
                  <td className="r mono">{r.amountPaid != null ? `$${r.amountPaid.toFixed(2)}` : "—"}</td>
                  <td><span className="lg-mid">MID {r.actualMid ?? r.plannedMid ?? "?"}</span>{r.cascade && <span className="lg-pill warn">casc</span>}</td>
                  <td className="nowrap">{r.success ? <span className="lg-pill ok"><i />Approved</span> : <span className="lg-pill no"><i />Declined</span>}{r.retried && <span className="lg-retry">RETRY</span>}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="lg-empty">No transactions match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="lg-scrim" onClick={() => setOpen(null)}>
          <div className="lg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lg-mh">
              <span className="lg-glyph big">CARD</span>
              <div style={{ flex: 1 }}><div className="lg-mt">{open.cardName}</div><div className="mut mono" style={{ fontSize: 12.5 }}>••{open.last4} · {open.flowName}</div></div>
              {open.success ? <span className="lg-pill ok"><i />Approved</span> : <span className="lg-pill no"><i />Declined</span>}
              {open.retried && <span className="lg-retry">RETRY</span>}
              <button className="lg-x" onClick={() => setOpen(null)}>✕</button>
            </div>
            <div className="lg-meta">
              <div><span>Product</span><b>{open.productName ?? "—"}</b></div>
              <div><span>Amount</span><b className="mono">{open.amountPaid != null ? `$${open.amountPaid.toFixed(2)}` : "—"}</b></div>
              <div><span>Gateway</span><b className="mono">MID {open.actualMid ?? open.plannedMid ?? "?"}</b></div>
              <div><span>Order</span><b className="mono">{open.orderId ?? "—"}</b></div>
              <div><span>Cascade</span><b>{open.cascade ? "yes" : "no"}</b></div>
              <div><span>Attempts</span><b>{attempts.length}</b></div>
            </div>
            <div className="lg-mb">
              <div className="lg-sect">Attempt history</div>
              <div className="lg-att">
                {attempts.map((a, i) => (
                  <div key={a.id} className={`lg-step ${a.success ? "pass" : "fail"}`}>
                    <span className="node" />
                    <div className="top"><span className="verdict">{a.success ? "APPROVED" : "DECLINED"}</span><span className="stamp mono">#{i + 1} · {fmtLong(a.firedAt)}</span></div>
                    <div className="line">{a.message ?? "—"}</div>
                    <div className="tags"><span className="lg-tag mono">MID {a.actualMid ?? a.plannedMid ?? "?"}</span>{a.orderId && <span className="lg-tag mono">order {a.orderId}</span>}{a.amountPaid != null && <span className="lg-tag">${a.amountPaid.toFixed(2)}</span>}</div>
                  </div>
                ))}
              </div>
              {raw && <details className="lg-raw"><summary>Raw CheckoutChamp response</summary><pre className="mono">{raw}</pre></details>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const off = 88 * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return <svg className="lg-ring" width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="none" stroke="var(--lg-border2)" strokeWidth="4" /><circle cx="17" cy="17" r="14" fill="none" stroke="var(--lg-good)" strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={off} transform="rotate(-90 17 17)" /></svg>;
}
function Spark({ days }: { days: number[] }) {
  if (days.length < 2) return null;
  const max = Math.max(...days, 1);
  const pts = days.map((n, i) => `${(i / (days.length - 1)) * 90},${32 - (n / max) * 28}`).join(" ");
  return <svg className="lg-spark" viewBox="0 0 90 32" preserveAspectRatio="none" fill="none"><polyline points={pts} stroke="var(--lg-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="90" cy={32 - (days[days.length - 1] / max) * 28} r="2.4" fill="var(--lg-accent)" /></svg>;
}

const STYLES = `
.lgroot{--lg-bg:#0c0d12;--lg-panel:#14151d;--lg-panel2:#171922;--lg-hover:#1b1d28;--lg-border:rgba(255,255,255,.07);--lg-border2:rgba(255,255,255,.12);--lg-text:#ecedf3;--lg-mut:#9aa1b2;--lg-faint:#6a7080;--lg-accent:#8480ff;--lg-accentink:#9b98ff;--lg-accsoft:rgba(132,128,255,.14);--lg-good:#34c98c;--lg-goodsoft:rgba(52,201,140,.14);--lg-bad:#f2595f;--lg-badsoft:rgba(242,89,95,.14);--lg-warn:#e5a94b;--lg-warnsoft:rgba(229,169,75,.15);--lg-mono:"Cascadia Code",ui-monospace,Consolas,monospace;color:var(--lg-text);font-variant-numeric:tabular-nums}
@media (prefers-color-scheme:light){.lgroot{--lg-bg:#f6f7fb;--lg-panel:#fff;--lg-panel2:#fbfbfe;--lg-hover:#f5f6fd;--lg-border:#e9eaf2;--lg-border2:#dde0ec;--lg-text:#1a1c24;--lg-mut:#5d6577;--lg-faint:#949bad;--lg-accent:#5a56e0;--lg-accentink:#4b47d6;--lg-accsoft:rgba(90,86,224,.09);--lg-good:#17915f;--lg-goodsoft:rgba(23,145,95,.12);--lg-bad:#d23b41;--lg-badsoft:rgba(210,59,65,.12);--lg-warn:#b07219;--lg-warnsoft:rgba(176,114,25,.14)}}
.lgroot .mono{font-family:var(--lg-mono)} .lgroot .mut{color:var(--lg-mut)} .lgroot .r{text-align:right} .lgroot .nowrap{white-space:nowrap}
.lg-head h1{margin:0;font-size:22px;font-weight:680;letter-spacing:-.02em} .lg-head p{margin:3px 0 0;font-size:13px;color:var(--lg-mut)}
.lg-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:20px 0 16px}
.lg-box{position:relative;overflow:hidden;background:var(--lg-panel);border:1px solid var(--lg-border);border-radius:14px;padding:15px 16px}
.lg-lab{font-size:12px;color:var(--lg-mut);font-weight:550} .lg-val{font-size:26px;font-weight:680;letter-spacing:-.025em;margin-top:7px} .lg-val small{font-size:15px;color:var(--lg-faint)}
.lg-spark{position:absolute;right:12px;bottom:12px;width:90px;height:32px} .lg-ring{position:absolute;right:14px;top:14px}
.lg-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.lg-seg{display:inline-flex;background:var(--lg-panel);border:1px solid var(--lg-border);border-radius:10px;padding:3px}
.lg-seg button{border:0;background:transparent;color:var(--lg-mut);font:inherit;font-weight:550;font-size:13px;padding:6px 13px;border-radius:7px;cursor:pointer} .lg-seg button.on{background:var(--lg-accsoft);color:var(--lg-accentink)} .lg-seg button span{color:var(--lg-faint);font-size:11px}
.lg-chip{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500;background:var(--lg-panel);border:1px solid var(--lg-border);border-radius:9px;padding:7px 11px;color:var(--lg-mut)}
.lg-chip select{border:0;background:transparent;color:var(--lg-text);font:inherit;font-weight:600;outline:none;max-width:180px}
.lg-input{background:var(--lg-panel);border:1px solid var(--lg-border);border-radius:9px;padding:8px 11px;color:var(--lg-text);font:inherit;width:150px}
.lg-faint{font-size:12px;color:var(--lg-faint)}
.lg-panel{background:var(--lg-panel);border:1px solid var(--lg-border);border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,.02),0 20px 46px -30px rgba(0,0,0,.5)}
.lg-scroll{overflow-x:auto}
.lg-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:820px}
.lg-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--lg-faint);font-weight:650;padding:11px 14px;border-bottom:1px solid var(--lg-border);background:var(--lg-panel2)}
.lg-tbl td{padding:10px 14px;border-bottom:1px solid var(--lg-border);vertical-align:middle}
.lg-tbl tbody tr{cursor:pointer} .lg-tbl tbody tr:hover td{background:var(--lg-hover)} .lg-tbl tr:last-child td{border-bottom:0}
.lg-tbl td.t{font-size:12px;color:var(--lg-mut)}
.lg-card{display:flex;align-items:center;gap:11px} .lg-card .nm{font-weight:580} .lg-card .pan{font-size:11.5px;color:var(--lg-faint)}
.lg-glyph{width:34px;height:22px;border-radius:5px;flex:none;display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.03em;background:linear-gradient(135deg,#2b2f45,#3a4066);color:#c9ccff}
@media (prefers-color-scheme:light){.lg-glyph{background:linear-gradient(135deg,#e7e8f5,#d8daf0);color:#5a56e0}}
.lg-glyph.big{width:42px;height:28px;margin-top:2px}
.lg-mid{font-size:12px;color:var(--lg-mut);background:var(--lg-panel2);border:1px solid var(--lg-border);border-radius:6px;padding:2px 7px;font-family:var(--lg-mono)}
.lg-pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:650;padding:3px 9px;border-radius:999px} .lg-pill i{width:6px;height:6px;border-radius:50%}
.lg-pill.ok{color:var(--lg-good);background:var(--lg-goodsoft)} .lg-pill.ok i{background:var(--lg-good)}
.lg-pill.no{color:var(--lg-bad);background:var(--lg-badsoft)} .lg-pill.no i{background:var(--lg-bad)}
.lg-pill.warn{color:var(--lg-warn);background:var(--lg-warnsoft);margin-left:4px}
.lg-retry{font-size:10px;font-weight:700;letter-spacing:.04em;color:var(--lg-warn);background:var(--lg-warnsoft);border-radius:5px;padding:1px 5px;margin-left:6px}
.lg-empty{text-align:center;color:var(--lg-faint);padding:34px}
.lg-tag{font-size:11.5px;color:var(--lg-mut);background:var(--lg-panel2);border:1px solid var(--lg-border);border-radius:6px;padding:2px 8px}
.lg-scrim{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,6,10,.58);backdrop-filter:blur(6px)}
.lg-modal{width:100%;max-width:620px;max-height:88vh;display:flex;flex-direction:column;background:var(--lg-panel);border:1px solid var(--lg-border2);border-radius:18px;overflow:hidden;box-shadow:0 32px 60px -28px rgba(0,0,0,.8)}
.lg-mh{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border-bottom:1px solid var(--lg-border)} .lg-mt{font-weight:660;font-size:18px;letter-spacing:-.02em}
.lg-x{margin-left:4px;width:32px;height:32px;border-radius:8px;border:1px solid var(--lg-border);background:var(--lg-panel2);color:var(--lg-mut);cursor:pointer}
.lg-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--lg-border);border-bottom:1px solid var(--lg-border)}
.lg-meta>div{background:var(--lg-panel);padding:12px 20px} .lg-meta span{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--lg-faint);font-weight:650;display:block} .lg-meta b{font-size:14px;font-weight:600;display:block;margin-top:4px}
.lg-mb{padding:16px 20px;overflow-y:auto} .lg-sect{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--lg-faint);font-weight:650;margin-bottom:14px}
.lg-att{position:relative;padding-left:26px} .lg-att::before{content:"";position:absolute;left:5px;top:8px;bottom:20px;width:2px;background:var(--lg-border2)}
.lg-step{position:relative;padding-bottom:18px} .lg-step:last-child{padding-bottom:0} .lg-step .node{position:absolute;left:-26px;top:2px;width:12px;height:12px;border-radius:50%;border:2px solid var(--lg-panel)}
.lg-step.fail .node{background:var(--lg-bad);box-shadow:0 0 0 4px var(--lg-badsoft)} .lg-step.pass .node{background:var(--lg-good);box-shadow:0 0 0 4px var(--lg-goodsoft)}
.lg-step .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap} .lg-step .verdict{font-size:13px;font-weight:700} .lg-step.fail .verdict{color:var(--lg-bad)} .lg-step.pass .verdict{color:var(--lg-good)}
.lg-step .stamp{font-size:12px;color:var(--lg-faint)} .lg-step .line{margin-top:5px;font-size:13px;color:var(--lg-mut)} .lg-step .tags{margin-top:8px;display:flex;gap:7px;flex-wrap:wrap}
.lg-raw{margin-top:14px;border:1px solid var(--lg-border);border-radius:10px;overflow:hidden} .lg-raw summary{list-style:none;cursor:pointer;padding:10px 13px;font-size:12.5px;font-weight:600;color:var(--lg-mut);background:var(--lg-panel2)} .lg-raw summary::-webkit-details-marker{display:none}
.lg-raw pre{margin:0;padding:13px;font-size:11px;line-height:1.55;color:var(--lg-mut);overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:260px}
@media (max-width:820px){.lg-kpis{grid-template-columns:repeat(2,1fr)}.lg-meta{grid-template-columns:repeat(2,1fr)}}
/* force LIGHT to match the (light) MUI app shell — cohesive, readable heading */
.lgroot{--lg-bg:#f6f7fb;--lg-panel:#fff;--lg-panel2:#fbfbfe;--lg-hover:#f5f6fd;--lg-border:#e9eaf2;--lg-border2:#dde0ec;--lg-text:#1a1c24;--lg-mut:#5d6577;--lg-faint:#949bad;--lg-accent:#5a56e0;--lg-accentink:#4b47d6;--lg-accsoft:rgba(90,86,224,.09);--lg-good:#17915f;--lg-goodsoft:rgba(23,145,95,.12);--lg-bad:#d23b41;--lg-badsoft:rgba(210,59,65,.12);--lg-warn:#b07219;--lg-warnsoft:rgba(176,114,25,.14)}
.lg-glyph{background:linear-gradient(135deg,#e7e8f5,#d8daf0);color:#5a56e0}
`;
