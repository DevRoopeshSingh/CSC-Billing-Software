// RFC 4180 CSV serializer with Excel-friendly UTF-8 BOM.
// Numbers stay raw so Excel can sum them; pair with a separate `currency`
// column when exporting money.

export const CSV_ROW_LIMIT = 10_000;

export type CsvCell = string | number | boolean | null | undefined | Date;

export interface CsvColumn<Row> {
  header: string;
  get: (row: Row) => CsvCell;
}

function escape(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString();
  }
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export interface CsvBuildResult {
  csv: string;
  rowCount: number;
  truncated: boolean;
}

export function buildCsv<Row>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  options: { limit?: number } = {}
): CsvBuildResult {
  const limit = options.limit ?? CSV_ROW_LIMIT;
  const truncated = rows.length > limit;
  const slice = truncated ? rows.slice(0, limit) : rows;

  const headerLine = columns.map((c) => escape(c.header)).join(",");
  const lines = slice.map((row) =>
    columns.map((col) => escape(col.get(row))).join(",")
  );

  return {
    csv: "﻿" + [headerLine, ...lines].join("\r\n"),
    rowCount: slice.length,
    truncated,
  };
}

// ── Parser ───────────────────────────────────────────────────────────────────
// Minimal RFC 4180 CSV parser. Strips a leading UTF-8 BOM, handles quoted
// fields (with `""` escapes and embedded commas/newlines), and tolerates LF
// or CRLF row terminators. All cell values are returned as raw strings —
// numeric/boolean coercion is the caller's responsibility.
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  errors: { line: number; message: string }[];
}

export function parseCsv(text: string): ParsedCsv {
  const errors: { line: number; message: string }[] = [];

  // Strip leading UTF-8 BOM if present.
  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let line = 1;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
        if (ch === "\n") line++;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") {
      // Swallow; the \n that follows ends the row.
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      line++;
      continue;
    }
    field += ch;
  }

  // Flush trailing field/row (file may not end with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  if (inQuotes) {
    errors.push({ line, message: "Unterminated quoted field" });
  }

  // Drop fully blank trailing rows.
  while (
    records.length > 0 &&
    records[records.length - 1].every((cell) => cell.length === 0)
  ) {
    records.pop();
  }

  if (records.length === 0) {
    return { headers: [], rows: [], errors };
  }

  const headers = records[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    if (cells.every((c) => c.length === 0)) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = cells[c] ?? "";
    }
    rows.push(obj);
  }

  return { headers, rows, errors };
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
