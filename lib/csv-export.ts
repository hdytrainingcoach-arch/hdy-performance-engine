'use client';

// Export CSV — toujours sur les données VISIBLES et FILTRÉES à l'écran (brief §7).
// Séparé par domaine : profils / Hooper-RPE / tests / GPS brut / médical autorisé —
// jamais un export unique fourre-tout.

export type Column<T> = { key: string; label: string; value?: (row: T) => unknown };

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // échappement CSV standard (RFC 4180)
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Column<T>[]): string {
  const header = columns.map((c) => cell(c.label)).join(';');
  const lines = rows.map((r) => columns.map((c) => cell(c.value ? c.value(r) : r[c.key])).join(';'));
  return '﻿' + [header, ...lines].join('\r\n'); // BOM : accents corrects dans Excel
}

/** Déclenche le téléchargement d'un CSV depuis le navigateur (sans backend). */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv<T extends Record<string, unknown>>(filename: string, rows: T[], columns: Column<T>[]) {
  downloadCsv(filename, toCsv(rows, columns));
}

export function timestampedName(prefix: string): string {
  const d = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${prefix}_${d}`;
}
