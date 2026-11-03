/**
 * Build a CSV file safely.
 * Cells starting with = + - @ are prefixed with ' so spreadsheet apps don't run them as formulas
 * (CSV/formula injection: a job number like "=HYPERLINK(...)" could otherwise run in Excel).
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          let s = v == null ? "" : String(v);
          if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}
