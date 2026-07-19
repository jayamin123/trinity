import type { ReactNode } from "react";

/* Horizontal filter row that everything drops into. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="ui-filters">{children}</div>;
}

/* Segmented toggle — [{value,label,count?}]. */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="ui-seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* Labeled inline dropdown chip (e.g. "Flow  [All ▾]"). */
export function SelectChip({ label, value, onChange, options, allLabel = "All" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <label className="ui-chip">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/* Inline checkbox chip. */
export function CheckChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ui-chip">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/* Search input styled as a filter control. */
export function SearchInput({ value, onChange, placeholder = "Search…", width }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number;
}) {
  return (
    <input
      className="ui-input"
      style={{ width: width ?? 180, flex: "none" }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
