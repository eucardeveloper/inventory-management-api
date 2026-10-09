// Pure helpers behind the dashboard chart: daily in/out totals for the last N days, and a ranked list of the
// most-moved products that replaces the chart when there is too little data for a line to say anything.
import { localDayKey, parseApiDate } from './dates.ts';

export interface MovementLike {
  movementType: 'IN' | 'OUT';
  quantity: number;
  occurredAt: string;
  productId: number;
  productName: string;
}

export interface DayPoint {
  date: Date;
  key: string;
  in: number;
  out: number;
}

export interface DailySeries {
  points: DayPoint[];
  /** Number of days that have at least one movement. */
  activeDays: number;
  totalIn: number;
  totalOut: number;
}

/** One point per calendar day, oldest first, ending on the day of `now`. Days without movements are zero. */
export function buildDailySeries(movements: MovementLike[], now: Date, days = 30): DailySeries {
  const perDay = new Map<string, { in: number; out: number }>();
  for (const m of movements) {
    const when = parseApiDate(m.occurredAt);
    if (!when) continue;
    const key = localDayKey(when);
    const bucket = perDay.get(key) ?? { in: 0, out: 0 };
    if (m.movementType === 'IN') bucket.in += m.quantity;
    else bucket.out += m.quantity;
    perDay.set(key, bucket);
  }
  const points: DayPoint[] = [];
  let activeDays = 0;
  let totalIn = 0;
  let totalOut = 0;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const key = localDayKey(d);
    const b = perDay.get(key) ?? { in: 0, out: 0 };
    if (b.in > 0 || b.out > 0) activeDays += 1;
    totalIn += b.in;
    totalOut += b.out;
    points.push({ date: d, key, in: b.in, out: b.out });
  }
  return { points, activeDays, totalIn, totalOut };
}

/** A line over 30 days needs some days with data to say anything; below that a ranked list reads better. */
export function isThinSeries(series: DailySeries, minActiveDays = 5): boolean {
  return series.activeDays < minActiveDays;
}

export interface MovedProduct {
  productId: number;
  name: string;
  in: number;
  out: number;
  total: number;
}

/** Products ranked by units moved (in + out) during the last `days` days. */
export function topMoved(movements: MovementLike[], now: Date, days = 30, limit = 5): MovedProduct[] {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
  const byProduct = new Map<number, MovedProduct>();
  for (const m of movements) {
    const when = parseApiDate(m.occurredAt);
    if (!when || when.getTime() < since) continue;
    const row = byProduct.get(m.productId) ?? { productId: m.productId, name: m.productName, in: 0, out: 0, total: 0 };
    if (m.movementType === 'IN') row.in += m.quantity;
    else row.out += m.quantity;
    row.total += m.quantity;
    byProduct.set(m.productId, row);
  }
  return [...byProduct.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, limit);
}
