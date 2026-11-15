/** Turns the ledger's day pickers (yyyy-mm-dd, local time) into the instants the API filters on. */
export function dayStartIso(day: string): string | undefined {
  const d = parseDay(day);
  return d ? new Date(d.y, d.m - 1, d.d, 0, 0, 0, 0).toISOString() : undefined;
}

/** The end of the picked day, so a "to" date includes that whole day. */
export function dayEndIso(day: string): string | undefined {
  const d = parseDay(day);
  return d ? new Date(d.y, d.m - 1, d.d, 23, 59, 59, 999).toISOString() : undefined;
}

export function isReversedDayRange(from: string, to: string): boolean {
  return Boolean(parseDay(from) && parseDay(to) && from > to);
}

function parseDay(day: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(y, m - 1, d);
  return check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d ? { y, m, d } : null;
}
