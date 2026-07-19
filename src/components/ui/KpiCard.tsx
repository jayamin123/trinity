import type { ReactNode } from "react";

/* KPI card with an optional inline visual (sparkline / ring / anything). */
export function KpiCard({ label, value, unit, tone, visual }: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: "good" | "bad";
  visual?: ReactNode;
}) {
  return (
    <div className="ui-kpi">
      <div className="lab">{label}</div>
      <div className={`val${tone ? " " + tone : ""}`}>{value}{unit && <small>{unit}</small>}</div>
      {visual}
    </div>
  );
}

export function KpiGrid({ n = 4, children }: { n?: number; children: ReactNode }) {
  return <div className="ui-kpis" style={{ ["--n" as string]: n }}>{children}</div>;
}

/* Trend sparkline — pass a series of numbers. */
export function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((n, i) => `${(i / (data.length - 1)) * 90},${32 - (n / max) * 28}`).join(" ");
  const lastY = 32 - (data[data.length - 1] / max) * 28;
  return (
    <svg className="ui-spark" viewBox="0 0 90 32" preserveAspectRatio="none" fill="none">
      <polyline points={pts} stroke="var(--app-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="90" cy={lastY} r="2.4" fill="var(--app-accent)" />
    </svg>
  );
}

/* Percentage ring gauge (0–100). */
export function RingGauge({ pct, tone = "good" }: { pct: number; tone?: "good" | "bad" | "warn" }) {
  const off = 88 * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  const stroke = tone === "good" ? "var(--app-good)" : tone === "bad" ? "var(--app-bad)" : "var(--app-warn)";
  return (
    <svg className="ui-ring" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="none" stroke="var(--app-border2)" strokeWidth="4" />
      <circle cx="17" cy="17" r="14" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={off} transform="rotate(-90 17 17)" />
    </svg>
  );
}
