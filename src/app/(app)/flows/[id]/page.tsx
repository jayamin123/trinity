"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { get } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";

type Flow = { id: string; name: string; status: string; startDate: string; endDate: string; ccGatewayName: string | null; ccCampaignName: string | null; totalCards: number; products: { id: string; name: string | null; price: number; count: number }[] };
type Day = { date: string; scheduled: number; done: number; pending: number; failed: number; rows: { id: string; cardName: string; panLast4: string; scheduledFor: string; status: string; productName: string | null; price: number; ccGatewayId: string | null; success: boolean | null }[] };
type Tx = { id: string; firedAt: string; cardName: string; panLast4: string; productName: string | null; amountPaid: number | null; actualMid: string | null; plannedMid: string | null; success: boolean; ccMessage: string | null };

export default function FlowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [tab, setTab] = useState<"schedule" | "logs">("schedule");
  const [days, setDays] = useState<Day[] | null>(null);
  const [logs, setLogs] = useState<Tx[] | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  useEffect(() => { get<Flow>(`/api/flows/${id}`).then(setFlow).catch(() => {}); }, [id]);
  useEffect(() => { if (tab === "schedule" && !days) get<Day[]>(`/api/flows/${id}/schedule`).then(setDays).catch(() => setDays([])); }, [tab, id, days]);
  useEffect(() => { if (tab === "logs" && !logs) get<Tx[]>(`/api/flows/${id}/logs`).then(setLogs).catch(() => setLogs([])); }, [tab, id, logs]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{flow?.name ?? "Flow"} {flow && <StatusPill status={flow.status} />}</h1>
          <p>{flow ? `${flow.ccGatewayName?.split(" - ")[0] ?? "—"} · ${flow.ccCampaignName ?? ""} · ${flow.totalCards} cards` : "…"}</p>
        </div>
        <div className="spacer" /><Link className="btn" href="/flows">← Flows</Link>
      </div>
      <div className="content">
        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={tab === "schedule" ? "on" : ""} onClick={() => setTab("schedule")}>Schedule</button>
          <button className={tab === "logs" ? "on" : ""} onClick={() => setTab("logs")}>Logs</button>
        </div>

        {tab === "schedule" && (!days ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Day (BKK)</th><th className="center">Scheduled</th><th className="center">Done</th><th className="center">Pending</th><th className="center">Failed</th><th /></tr></thead>
              <tbody>
                {days.map((d) => (
                  <FragmentDay key={d.date} d={d} open={openDay === d.date} onToggle={() => setOpenDay(openDay === d.date ? null : d.date)} />
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {tab === "logs" && (!logs ? <div className="loading">Loading…</div> : (
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Time</th><th>Card</th><th>Product</th><th className="right">Amount</th><th>MID</th><th>Status</th></tr></thead>
              <tbody>
                {logs.map((t) => (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{new Date(t.firedAt).toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td><b>{t.cardName}</b> <span className="faint mono">••{t.panLast4}</span></td>
                    <td className="muted">{t.productName ?? "—"}</td>
                    <td className="right mono">{t.amountPaid != null ? `$${t.amountPaid.toFixed(2)}` : "—"}</td>
                    <td><span className="tag mono">MID {t.actualMid ?? t.plannedMid ?? "?"}</span></td>
                    <td>{t.success ? <span className="pill ok"><span className="dot" />Approved</span> : <span className="pill no"><span className="dot" />Declined</span>}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={6} className="loading">No transactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}

function FragmentDay({ d, open, onToggle }: { d: Day; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="clk" onClick={onToggle}>
        <td className="mono">{d.date}</td>
        <td className="center num">{d.scheduled}</td>
        <td className="center num" style={{ color: "var(--good)" }}>{d.done}</td>
        <td className="center num">{d.pending}</td>
        <td className="center num" style={{ color: d.failed ? "var(--bad)" : "inherit" }}>{d.failed}</td>
        <td className="right faint">{open ? "▾" : "▸"}</td>
      </tr>
      {open && d.rows.map((r) => (
        <tr key={r.id} style={{ background: "var(--panel-2)" }}>
          <td className="mono faint" style={{ fontSize: 11.5, paddingLeft: 26 }}>{new Date(r.scheduledFor).toISOString().slice(11, 16)}</td>
          <td colSpan={2}><b>{r.cardName}</b> <span className="faint mono">••{r.panLast4}</span></td>
          <td className="muted" style={{ fontSize: 12 }}>{r.productName} · ${r.price} · MID {r.ccGatewayId}</td>
          <td colSpan={2}>{r.status === "done" ? (r.success === false ? <span className="pill no"><span className="dot" />failed</span> : <span className="pill ok"><span className="dot" />done</span>) : <span className="pill warn"><span className="dot" />{r.status}</span>}</td>
        </tr>
      ))}
    </>
  );
}
