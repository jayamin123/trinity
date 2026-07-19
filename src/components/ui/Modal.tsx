"use client";
import type { ReactNode } from "react";

/* Scrim + centered panel. Click-outside and ✕ both close. */
export function Modal({ open, onClose, header, meta, children, maxWidth = 620 }: {
  open: boolean;
  onClose: () => void;
  header: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div className="ui-scrim" onClick={onClose}>
      <div className="ui-modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="mh">{header}<button className="ui-x" onClick={onClose}>✕</button></div>
        {meta}
        {children && <div className="mb">{children}</div>}
      </div>
    </div>
  );
}

/* Key/value grid used under a modal header. */
export function MetaGrid({ n = 3, items }: { n?: number; items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="ui-meta" style={{ ["--n" as string]: n }}>
      {items.map((it, i) => (
        <div key={i}><span>{it.label}</span><b>{it.value}</b></div>
      ))}
    </div>
  );
}

/* Vertical event timeline (e.g. attempt history). */
export function Timeline({ children }: { children: ReactNode }) {
  return <div className="ui-timeline">{children}</div>;
}
export function TimelineStep({ pass, title, stamp, line, tags }: {
  pass: boolean; title: ReactNode; stamp?: ReactNode; line?: ReactNode; tags?: ReactNode;
}) {
  return (
    <div className={`ui-step ${pass ? "pass" : "fail"}`}>
      <span className="node" />
      <div className="top"><span className="verdict">{title}</span>{stamp && <span className="stamp ui-mono">{stamp}</span>}</div>
      {line && <div className="line">{line}</div>}
      {tags && <div className="tags">{tags}</div>}
    </div>
  );
}

/* Collapsible raw payload block. */
export function RawDetails({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="ui-raw">
      <summary>{summary}</summary>
      <pre>{children}</pre>
    </details>
  );
}
