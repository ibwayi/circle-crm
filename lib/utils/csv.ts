/**
 * Browser-side CSV export. Used by bulk actions on each entity table
 * to dump the selected rows into a download.
 *
 * Format choices:
 *   * UTF-8 with BOM (﻿ prefix) — Excel on Windows interprets
 *     CSV files as ANSI by default and renders ä/ö/ü/ß as garbage
 *     without the BOM. The BOM is invisible to all other consumers
 *     (Numbers, LibreOffice, Google Sheets, Python's csv module).
 *   * Comma separator — universal default. German locales prefer
 *     semicolon for Excel, but the BOM gives us UTF-8 which already
 *     biases Excel toward "international" parsing where comma works.
 *   * RFC 4180 quoting: every field wrapped in double quotes; embedded
 *     double quotes doubled. Catches commas/newlines/quotes in any
 *     value (deal title, company name, notes).
 *   * CRLF line endings — Excel-friendly without breaking POSIX tools.
 *
 * Trigger: Blob → URL.createObjectURL → hidden anchor `.click()` →
 * revokeObjectURL on next tick. Standard browser-download recipe.
 */

const BOM = "﻿"
const NEWLINE = "\r\n"

export type CsvColumn<T> = {
  key: keyof T | ((row: T) => unknown)
  label: string
}

export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns: CsvColumn<T>[]
): void {
  if (typeof window === "undefined") return

  const header = columns.map((c) => quote(c.label)).join(",")
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = typeof c.key === "function" ? c.key(row) : row[c.key]
          return quote(stringify(raw))
        })
        .join(",")
    )
    .join(NEWLINE)

  const csv = `${BOM}${header}${NEWLINE}${body}${NEWLINE}`

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Microtask delay so Safari has time to start the download before
  // the URL is invalidated.
  queueMicrotask(() => URL.revokeObjectURL(url))
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (v instanceof Date) return v.toISOString()
  if (typeof v === "boolean") return v ? "ja" : "nein"
  return String(v)
}

function quote(s: string): string {
  // RFC 4180: double the inner quotes, wrap the whole thing.
  return `"${s.replace(/"/g, '""')}"`
}
