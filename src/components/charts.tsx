// Small pure SVG chart bits shared by the KPI cards (Logs + Dashboard).

export function Ring({ pct, color = "var(--good)" }: { pct: number; color?: string }) {
  const off = 88 * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <svg className="ring" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="none" stroke="var(--border-strong)" strokeWidth="4" />
      <circle cx="17" cy="17" r="14" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={off} transform="rotate(-90 17 17)" />
    </svg>
  );
}

export function Spark({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((n, i) => `${(i / (data.length - 1)) * 90},${32 - (n / max) * 28}`).join(" ");
  const last = 32 - (data[data.length - 1] / max) * 28;
  return (
    <svg className="spark" viewBox="0 0 90 32" preserveAspectRatio="none" fill="none">
      <polyline points={pts} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="90" cy={last} r="2.4" fill="var(--accent)" />
    </svg>
  );
}
