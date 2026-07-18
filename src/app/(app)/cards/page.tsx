"use client";
import { useEffect, useMemo, useState } from "react";
import { get, post } from "@/lib/api";

type Bal = { isUnlimited: boolean; start: number | null; remaining: number | null; label: string; usable: boolean; overBalance: boolean };
type CardRow = { id: string; name: string; panLast4: string; email: string | null; sourceFile: string | null; balance: Bal; pending: number; done: number; flowIds: string[] };

const TABS = [["all", "All"], ["pool", "Pool"], ["pending", "Pending"], ["fired", "Fired"]] as const;

export default function CardsPage() {
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [tab, setTab] = useState<string>("all");
  const [bal, setBal] = useState("all");
  const [source, setSource] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { get<CardRow[]>("/api/cards").then(setCards).catch(() => setCards([])); }, []);

  const sources = useMemo(() => [...new Set((cards ?? []).map((c) => c.sourceFile).filter(Boolean))] as string[], [cards]);
  const rows = useMemo(() => (cards ?? []).filter((c) => {
    if (tab === "pool" && !(c.pending === 0 && c.balance.usable)) return false;
    if (tab === "pending" && c.pending === 0) return false;
    if (tab === "fired" && c.done === 0) return false;
    if (bal === "unlim" && !c.balance.isUnlimited) return false;
    if (bal === "has" && (c.balance.isUnlimited || !c.balance.usable)) return false;
    if (source !== "all" && c.sourceFile !== source) return false;
    return true;
  }), [cards, tab, bal, source]);

  return (
    <>
      <div className="topbar"><div><h1>Cards</h1><p>{cards ? `${cards.length.toLocaleString()} cards in pool` : "…"}</p></div></div>
      <div className="content">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <div className="seg">{TABS.map(([v, l]) => <button key={v} className={tab === v ? "on" : ""} onClick={() => setTab(v)}>{l}</button>)}</div>
          <select className="input" style={{ width: "auto" }} value={bal} onChange={(e) => setBal(e.target.value)}>
            <option value="all">Balance: All</option><option value="unlim">Unlimited</option><option value="has">Has a balance</option>
          </select>
          <select className="input" style={{ width: "auto", maxWidth: 260 }} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">Source: All</option>{sources.map((s) => <option key={s} value={s}>{s.length > 34 ? "…" + s.slice(-32) : s}</option>)}
          </select>
          <div className="spacer" /><span className="faint" style={{ fontSize: 12 }}>{rows.length.toLocaleString()} shown</span>
        </div>
        {!cards ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Card</th><th>Email</th><th>Balance</th><th>Source</th><th className="center">Sched.</th></tr></thead>
              <tbody>
                {rows.slice(0, 500).map((c) => (
                  <tr key={c.id} className="clk" onClick={() => setOpenId(c.id)}>
                    <td><b>{c.name}</b></td>
                    <td className="mono">••{c.panLast4}</td>
                    <td className="muted">{c.email ?? "—"}</td>
                    <td><BalanceCell b={c.balance} /></td>
                    <td className="faint" style={{ fontSize: 11.5 }}>{c.sourceFile ? (c.sourceFile.length > 24 ? "…" + c.sourceFile.slice(-22) : c.sourceFile) : "—"}</td>
                    <td className="center">{c.pending > 0 && <span className="pill warn"><span className="dot" />{c.pending}p</span>} {c.done > 0 && <span className="pill ok"><span className="dot" />{c.done}✓</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 500 && <div className="pb faint">Showing first 500 of {rows.length.toLocaleString()}.</div>}
          </div>
        )}
      </div>
      {openId && <CardModal id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function BalanceCell({ b }: { b: Bal }) {
  if (b.isUnlimited) return <span className="pill info"><span className="dot" />Unlimited</span>;
  if (b.overBalance) return <span className="pill no"><span className="dot" />over by ${Math.abs(b.remaining ?? 0).toFixed(2)}</span>;
  return <span className={b.usable ? "" : "faint"}>{b.label}</span>;
}

type CardDetail = { name: string; panLast4: string; expMonth: string; expYear: string; email: string | null; phone: string | null; address: string; sourceFile: string | null; balance: Bal; schedules: { id: string; scheduledFor: string; status: string; productName: string | null; price: number }[]; transactions: { id: string; firedAt: string; success: boolean; ccMessage: string | null; amountPaid: number | null }[] };

function CardModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [c, setC] = useState<CardDetail | null>(null);
  const [secret, setSecret] = useState<string>("");
  useEffect(() => { get<CardDetail>(`/api/cards/${id}`).then(setC).catch(() => onClose()); }, [id, onClose]);
  async function reveal() {
    try { const s = await post<{ pan: string; cvv: string }>(`/api/cards/${id}/reveal`); setSecret(`${s.pan} · CVV ${s.cvv}`); }
    catch (e) { setSecret(e instanceof Error ? e.message : "unavailable"); }
  }
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {!c ? <div className="loading">Loading…</div> : (
          <>
            <div className="mh">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 660, fontSize: 17 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}><span className="mono">••{c.panLast4}</span> · exp {c.expMonth}/{c.expYear} · {c.email ?? "—"}</div>
              </div>
              <button className="mclose" onClick={onClose}>✕</button>
            </div>
            <div className="mb">
              <div style={{ marginBottom: 12 }}><BalanceCell b={c.balance} /> &nbsp; <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={reveal}>Reveal card</button> {secret && <span className="mono" style={{ fontSize: 12, marginLeft: 8 }}>{secret}</span>}</div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{c.address}</div>
              <div className="ph" style={{ borderRadius: 8, marginBottom: 8 }}>Schedules ({c.schedules.length})</div>
              {c.schedules.map((s) => <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 2px", borderBottom: "1px solid var(--border)" }}><span className="mono">{new Date(s.scheduledFor).toISOString().slice(0, 16).replace("T", " ")}</span><span>{s.productName} · ${s.price}</span><span className="pill mut">{s.status}</span></div>)}
              <div className="ph" style={{ borderRadius: 8, margin: "12px 0 8px" }}>Transactions ({c.transactions.length})</div>
              {c.transactions.map((t) => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 2px", borderBottom: "1px solid var(--border)" }}><span className="mono">{new Date(t.firedAt).toISOString().slice(0, 16).replace("T", " ")}</span><span className="muted">{t.ccMessage}</span><span className={`pill ${t.success ? "ok" : "no"}`}><span className="dot" />{t.success ? "ok" : "fail"}</span></div>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
