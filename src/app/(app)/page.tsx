"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/api";

type Stats = {
  cards: number; activeFlows: number; chargesToday: number; approvalRate: number;
  volumeToday: number; midsToday: number; failedToday: number; totalCharges: number;
};

export default function DashboardPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { get<Stats>("/api/dashboard").then(setS).catch((e) => setErr(e.message)); }, []);

  return (
    <>
      <div className="topbar"><div><h1>Dashboard</h1><p>Trinity Flows · ledger v2 · reading the transactions ledger</p></div></div>
      <div className="content">
        {err && <div className="pill no"><span className="dot" />{err}</div>}
        {!s ? <div className="loading">Loading…</div> : (
          <>
            <div className="grid g4">
              <Kpi lab="Cards in pool" val={s.cards.toLocaleString()} />
              <Kpi lab="Active flows" val={String(s.activeFlows)} />
              <Kpi lab="Charges today" val={String(s.chargesToday)} delta={`${s.failedToday} failed`} />
              <Kpi lab="Approval rate" val={`${s.approvalRate}`} suffix="%" up />
            </div>
            <div className="grid g4" style={{ marginTop: 14 }}>
              <Kpi lab="Volume today" val={`$${s.volumeToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
              <Kpi lab="MIDs used today" val={String(s.midsToday)} />
              <Kpi lab="Total charges (all-time)" val={s.totalCharges.toLocaleString()} />
              <Kpi lab="Firing" val="OFF" delta="flows2 has no cron" />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ lab, val, suffix, delta, up }: { lab: string; val: string; suffix?: string; delta?: string; up?: boolean }) {
  return (
    <div className="box kpi">
      <div className="lab">{lab}</div>
      <div className="val num">{val}{suffix && <small>{suffix}</small>}</div>
      {delta && <div className={`delta ${up ? "up" : "faint"}`}>{delta}</div>}
    </div>
  );
}
