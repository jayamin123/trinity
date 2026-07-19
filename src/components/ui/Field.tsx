import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";

/* Labeled text input for forms. */
export function Field({ label, children, ...rest }: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="ui-field">
      {label && <label>{label}</label>}
      <input className="ui-input" {...rest} />
    </div>
  );
}

/* Labeled select for forms. */
export function SelectField({ label, children, ...rest }: { label?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="ui-field">
      {label && <label>{label}</label>}
      <select className="ui-input" {...rest}>{children}</select>
    </div>
  );
}

/* Underline tabs (page-level section switch). */
export function Tabs<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="ui-tabs">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="count">{o.count.toLocaleString()}</span>}
        </button>
      ))}
    </div>
  );
}
