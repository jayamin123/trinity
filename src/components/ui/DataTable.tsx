import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  /** cell tone helper: "mut" muted, "t" time-style */
  cell?: "mut" | "t";
  render: (row: T) => ReactNode;
};

/* Generic, theme-native table — the design-system replacement for MUI DataGrid.
   Column-config driven; rows are plain data. Click handler is optional. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty = "Nothing to show.", minWidth = 720 }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="ui-panel table">
      <div className="ui-scroll">
        <table className="ui-tbl" style={{ minWidth }}>
          <thead>
            <tr>{columns.map((c) => <th key={c.key} className={c.align === "right" ? "r" : ""}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={onRowClick ? "clickable" : ""} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={[c.align === "right" && "ui-r", c.cell].filter(Boolean).join(" ")}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={columns.length} className="ui-empty">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
