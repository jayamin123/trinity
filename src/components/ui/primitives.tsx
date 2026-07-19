import type { ReactNode, ButtonHTMLAttributes } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/* ---- page header ------------------------------------------------------ */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="ui-head">
      <div style={{ flex: 1 }}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ui-row wrap">{actions}</div>}
    </div>
  );
}

/* ---- surface ---------------------------------------------------------- */
export function Panel({ children, pad, className, style }: { children: ReactNode; pad?: boolean; className?: string; style?: React.CSSProperties }) {
  return <div className={cx("ui-panel", pad && "pad", className)} style={style}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="ui-sect">{children}</div>;
}

/* ---- buttons ---------------------------------------------------------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};
export function Button({ variant = "primary", size = "md", icon, children, className, ...rest }: BtnProps) {
  return (
    <button className={cx("ui-btn", variant, size !== "md" && size, className)} {...rest}>
      {icon}{children}
    </button>
  );
}

export function IconButton({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cx("ui-iconbtn", className)} {...rest}>{children}</button>;
}

/* ---- pills / tags / chips --------------------------------------------- */
type Tone = "good" | "bad" | "warn" | "info" | "neutral";
export function Pill({ tone, dot = true, children }: { tone: Tone; dot?: boolean; children: ReactNode }) {
  return <span className={cx("ui-pill", tone)}>{dot && tone !== "neutral" && <i />}{children}</span>;
}

export function Tag({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <span className={cx("ui-tag", mono && "ui-mono")}>{children}</span>;
}

export function MidChip({ mid }: { mid: ReactNode }) {
  return <span className="ui-mid">MID {mid}</span>;
}

export function Badge({ tone = "warn", children }: { tone?: "warn" | "accent"; children: ReactNode }) {
  return <span className={cx("ui-badge", tone)}>{children}</span>;
}

/* ---- card cell (glyph + name + pan) ----------------------------------- */
export function CardCell({ name, last4, glyph = "CARD", big }: { name: ReactNode; last4?: string; glyph?: string; big?: boolean }) {
  return (
    <div className="ui-cardcell">
      <span className={cx("ui-glyph", big && "big")}>{glyph}</span>
      <div>
        <div className="nm">{name}</div>
        {last4 != null && <div className="pan ui-mono">••{last4}</div>}
      </div>
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="ui-mono">{children}</span>;
}
