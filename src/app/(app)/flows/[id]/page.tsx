"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { get, post, del } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { AttemptsModal } from "@/components/AttemptsModal";

type Flow = { id: string; name: string; status: string; startDate: string; endDate: string; ccGatewayName: string | null; ccCampaignName: string | null; totalCards: number; products: { id: string; name: string | null; price: number; count: number }[] };
type SRow = { id: string; cardName: string; panLast4: string; scheduledFor: string; status: string; productName: string | null; price: number; ccGatewayId: string | null; success: boolean | null };
type Day = { date: string; scheduled: number; done: number; pending: number; failed: number; rows: SRow[] };
type Tx = { id: string; scheduleId: string; firedAt: string; cardName: string; panLast4: string; productName: string | null; amountPaid: number | null; actualMid: string | null; plannedMid: string | null; success: boolean; ccMessage: string | null; retried: boolean };

const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
const todayStr = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function FlowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [tab, setTab] = useState<"schedule" | "logs">("schedule");
  const [days, setDays] = useState<Day[] | null>(null);
  const [logs, setLogs] = useState<Tx[] | null>(null);
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState<"future" | "past" | "all">("all");
  const [showFailed, setShowFailed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<{ scheduleId: string; cardName: string; panLast4: string } | null>(null);
  const [logMid, setLogMid] = useState("all");
  const [logVerdict, setLogVerdict] = useState("all");

  const loadFlow = useCallback(() => get<Flow>(`/api/flows/${id}`).then(setFlow).catch(() => {}), [id]);
  const loadDays = useCallback(() => get<Day[]>(`/api/flows/${id}/schedule`).then(setDays).catch(() => setDays([])), [id]);
  const loadLogs = useCallback(() => get<Tx[]>(`/api/flows/${id}/logs`).then(setLogs).catch(() => setLogs([])), [id]);
  useEffect(() => { loadFlow(); }, [loadFlow]);
  useEffect(() => { if (tab === "schedule") loadDays(); }, [tab, loadDays]);
  useEffect(() => { if (tab === "logs" && !logs) loadLogs(); }, [tab, logs, loadLogs]);

  const today = todayStr();
  const shownDays = useMemo(() => (days ?? []).filter((d) => {
    if (when === "future" && d.date < today) return false;
    if (when === "past" && d.date >= today) return false;
    if (showFailed && d.failed === 0) return false;
    return true;
  }), [days, when, showFailed, today]);

  const logMids = useMemo(() => [...new Set((logs ?? []).map((l) => l.actualMid ?? l.plannedMid).filter(Boolean))] as string[], [logs]);
  const shownLogs = useMemo(() => (logs ?? []).filter((l) =>
    (logVerdict === "all" || (logVerdict === "ok") === l.success) &&
    (logMid === "all" || (l.actualMid ?? l.plannedMid) === logMid)
  ), [logs, logVerdict, logMid]);

  async function toggleDay(d: string) { setOpenDays((s) => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n; }); }
  async function pauseResume() {
    if (!flow) return;
    await post(`/api/flows/${id}/${flow.status === "paused" ? "resume" : "pause"}`);
    loadFlow();
  }
  async function deleteSchedule(sid: string) {
    if (!confirm("Delete this pending schedule? The card returns to the pool.")) return;
    try { await del(`/api/schedules/${sid}`); loadDays(); loadFlow(); } catch (e) { alert(e instanceof Error ? e.message : "failed"); }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{flow?.name ?? "Flow"} {flow && <StatusPill status={flow.status} />}</h1>
          <p>{flow ? `${flow.ccGatewayName?.split(" - ")[0] ?? "—"} · ${flow.ccCampaignName ?? ""} · ${flow.totalCards} cards · ${flow.products.length} products` : "…"}</p>
        </div>
        <div className="spacer" />
        {flow && <button className="btn" onClick={pauseResume}>{flow.status === "paused" ? "Resume" : "Pause"}</button>}
        <button className="btn primary" onClick={() => setAddOpen(true)}>+ Add cards</button>
        <Link className="btn" href="/flows">← Flows</Link>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div className="seg">
            <button className={tab === "schedule" ? "on" : ""} onClick={() => setTab("schedule")}>Schedule</button>
            <button className={tab === "logs" ? "on" : ""} onClick={() => setTab("logs")}>Logs</button>
          </div>
          {tab === "schedule" && <>
            <label className="chip">When: <select value={when} onChange={(e) => setWhen(e.target.value as "future" | "past" | "all")}><option value="all">All</option><option value="future">Future</option><option value="past">Past</option></select></label>
            <label className="chip">Show: <select value={showFailed ? "failed" : "all"} onChange={(e) => setShowFailed(e.target.value === "failed")}><option value="all">All</option><option value="failed">Only failed</option></select></label>
            <button className="chip" onClick={() => setOpenDays(new Set(shownDays.map((d) => d.date)))}>Expand all</button>
            <button className="chip" onClick={() => setOpenDays(new Set())}>Collapse</button>
          </>}
          {tab === "logs" && <>
            <label className="chip">Verdict: <select value={logVerdict} onChange={(e) => setLogVerdict(e.target.value)}><option value="all">All</option><option value="ok">Approved</option><option value="fail">Declined</option></select></label>
            <label className="chip">MID: <select value={logMid} onChange={(e) => setLogMid(e.target.value)}><option value="all">All</option>{logMids.map((m) => <option key={m} value={m}>MID {m}</option>)}</select></label>
          </>}
        </div>

        {tab === "schedule" && (!days ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Day (BKK)</th><th className="center">Scheduled</th><th className="center">Done</th><th className="center">Pending</th><th className="center">Failed</th><th /></tr></thead>
              <tbody>
                {shownDays.map((d) => [
                  <tr key={d.date} className="clk" onClick={() => toggleDay(d.date)}>
                    <td className="mono">{d.date}</td>
                    <td className="center num">{d.scheduled}</td>
                    <td className="center num" style={{ color: "var(--good)" }}>{d.done}</td>
                    <td className="center num" style={{ color: "var(--warn)" }}>{d.pending}</td>
                    <td className="center num" style={{ color: d.failed ? "var(--bad)" : "inherit" }}>{d.failed}</td>
                    <td className="right faint">{openDays.has(d.date) ? "▾" : "▸"}</td>
                  </tr>,
                  ...(openDays.has(d.date) ? d.rows.map((r) => (
                    <tr key={r.id} style={{ background: "var(--panel-2)" }}>
                      <td className="mono faint" style={{ fontSize: 11.5, paddingLeft: 24 }}>{new Date(r.scheduledFor).toISOString().slice(11, 16)}</td>
                      <td colSpan={2} className="clk" onClick={() => setDetail({ scheduleId: r.id, cardName: r.cardName, panLast4: r.panLast4 })}><b>{r.cardName}</b> <span className="faint mono">••{r.panLast4}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.productName} · ${r.price} · MID {r.ccGatewayId}</td>
                      <td colSpan={2} className="right">
                        {r.status === "done" ? (r.success === false ? <span className="pill no"><span className="dot" />failed</span> : <span className="pill ok"><span className="dot" />done</span>)
                          : <><span className="pill warn"><span className="dot" />{r.status}</span> <button className="btn" style={{ padding: "2px 8px", fontSize: 11, marginLeft: 6 }} onClick={() => deleteSchedule(r.id)}>Delete</button></>}
                      </td>
                    </tr>
                  )) : []),
                ])}
                {shownDays.length === 0 && <tr><td colSpan={6} className="loading">No days match.</td></tr>}
              </tbody>
            </table>
          </div>
        ))}

        {tab === "logs" && (!logs ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Time</th><th>Card</th><th>Product</th><th className="right">Amount</th><th>MID</th><th>Status</th></tr></thead>
              <tbody>
                {shownLogs.map((t) => (
                  <tr key={t.id} className="clk" onClick={() => setDetail({ scheduleId: t.scheduleId, cardName: t.cardName, panLast4: t.panLast4 })}>
                    <td className="mono" style={{ fontSize: 12 }}>{fmt(t.firedAt)}</td>
                    <td><b>{t.cardName}</b> <span className="faint mono">••{t.panLast4}</span></td>
                    <td className="muted">{t.productName ?? "—"}</td>
                    <td className="right mono">{t.amountPaid != null ? `$${t.amountPaid.toFixed(2)}` : "—"}</td>
                    <td><span className="mid-chip">MID {t.actualMid ?? t.plannedMid ?? "?"}</span></td>
                    <td className="nowrap">{t.success ? <span className="pill ok"><span className="dot" />Approved</span> : <span className="pill no"><span className="dot" />Declined</span>}{t.retried && <span className="retryflag">RETRY</span>}</td>
                  </tr>
                ))}
                {shownLogs.length === 0 && <tr><td colSpan={6} className="loading">No transactions.</td></tr>}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {addOpen && flow && <AddCardsDialog flowId={id} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); loadDays(); loadFlow(); }} />}
      {detail && <AttemptsModal scheduleId={detail.scheduleId} title={detail.cardName} sub={`••${detail.panLast4}`} onClose={() => setDetail(null)} />}
    </>
  );
}

function AddCardsDialog({ flowId, onClose, onDone }: { flowId: string; onClose: () => void; onDone: () => void }) {
  const [count, setCount] = useState(10);
  const [start, setStart] = useState(plusDays(60));
  const [end, setEnd] = useState(plusDays(67));
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [avail, setAvail] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { get<string[]>("/api/cards/sources").then((s) => { setSources(s); const dummy = s.find((x) => /dummy/i.test(x)); if (dummy) setSource(dummy); }).catch(() => {}); }, []);
  useEffect(() => { post<{ available: number }>(`/api/flows/${flowId}/preview-cards`, { count, source: source || undefined }).then((r) => setAvail(r.available)).catch(() => setAvail(null)); }, [flowId, count, source]);
  async function add() {
    setBusy(true); setMsg("");
    try { const r = await post<{ added: number }>(`/api/flows/${flowId}/add-cards`, { count, startDate: start, endDate: end, source: source || undefined }); setMsg(`Added ${r.added} cards`); setTimeout(onDone, 700); }
    catch (e) { setMsg(e instanceof Error ? e.message : "failed"); setBusy(false); }
  }
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="mh"><div style={{ flex: 1 }}><div style={{ fontWeight: 660, fontSize: 17 }}>Add cards</div><div className="faint" style={{ fontSize: 12 }}>Schedule cards into this flow (won&apos;t fire — no cron)</div></div><button className="mclose" onClick={onClose}>✕</button></div>
        <div className="mb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>Source</div><select className="input" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Any available</option>{sources.map((s) => <option key={s} value={s}>{s.length > 34 ? "…" + s.slice(-32) : s}</option>)}</select></label>
          <label><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>How many</div><input className="input" type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ flex: 1 }}><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>Start</div><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label style={{ flex: 1 }}><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>End</div><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <div className="faint" style={{ fontSize: 12.5 }}>{avail != null ? `${avail} cards available to schedule` : "…"}</div>
          {msg && <div className="pill mut">{msg}</div>}
        </div>
        <div className="m-foot"><div className="spacer" /><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !avail} onClick={add}>{busy ? "Adding…" : `Add ${Math.min(count, avail ?? 0)} cards`}</button></div>
      </div>
    </div>
  );
}

