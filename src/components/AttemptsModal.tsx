"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/api";

type Attempt = { id: string; firedAt: string; success: boolean; orderId: string | null; actualMid: string | null; plannedMid: string | null; ccMessage: string | null; amountPaid: number | null; rawResponse: string | null };

export function AttemptsModal({ scheduleId, title, sub, onClose }: { scheduleId: string; title: string; sub: string; onClose: () => void }) {
  const [items, setItems] = useState<Attempt[] | null>(null);
  useEffect(() => { get<Attempt[]>(`/api/schedules/${scheduleId}/attempts`).then(setItems).catch(() => setItems([])); }, [scheduleId]);
  const raw = items?.find((a) => a.rawResponse)?.rawResponse;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mh"><span className="cardglyph" style={{ width: 42, height: 28, marginTop: 2 }}>CARD</span><div style={{ flex: 1 }}><div style={{ fontWeight: 660, fontSize: 17 }}>{title}</div><div className="muted mono" style={{ fontSize: 12.5 }}>{sub}</div></div><button className="mclose" onClick={onClose}>✕</button></div>
        <div className="mb">
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-faint)", fontWeight: 650, marginBottom: 14 }}>Attempt history · {items?.length ?? 0}</div>
          {items && items.length === 0 && <div className="faint">No fire attempts yet (this schedule hasn&apos;t fired).</div>}
          <div className="att">
            {(items ?? []).map((a, i) => (
              <div key={a.id} className={`step ${a.success ? "pass" : "fail"}`}>
                <span className="node" /><div className="top"><span className="verdict">{a.success ? "APPROVED" : "DECLINED"}</span><span className="stamp mono">#{i + 1} · {new Date(a.firedAt).toISOString().slice(0, 19).replace("T", " ")}</span></div>
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
