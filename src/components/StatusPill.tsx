export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { active: "ok", paused: "warn", completed: "info" };
  return <span className={`pill ${map[status] ?? "mut"}`}><span className="dot" />{status}</span>;
}
