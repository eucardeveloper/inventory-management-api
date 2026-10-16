/**
 * CSV serialisation that follows RFC 4180 and is safe to open in a spreadsheet.
 *
 * Product names and article numbers are user input. A cell that starts with = + - @ (or a tab or
 * carriage return) is executed as a formula by Excel and LibreOffice, so text cells are prefixed
 * with an apostrophe. Genuine numbers are left alone so negative figures stay numeric.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value !== 'number' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(cell).join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))];
  return lines.join('\r\n');
}
