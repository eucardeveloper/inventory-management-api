// Axis helpers for the movement chart: a "nice" maximum and evenly spaced tick values, so the y-axis
// reads 0, 10, 20, 30 instead of 0, 7, 14, 21 and a single spike cannot produce an odd scale.

export interface NiceScale {
  max: number;
  step: number;
  ticks: number[];
}

/** Rounds `step` up to 1, 2, 2.5, 5 or 10 times a power of ten. */
function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const f = raw / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

export function niceScale(maxValue: number, targetTicks = 4): NiceScale {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  if (safeMax === 0) return { max: 4, step: 1, ticks: [0, 1, 2, 3, 4] };
  let step = niceStep(safeMax / Math.max(1, targetTicks));
  if (step < 1) step = 1; // quantities are whole units
  const max = Math.ceil(safeMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { max, step, ticks };
}

/** Indices of the x labels to print so that labels never overlap: at most one per `minPx` of width. */
export function labelIndices(count: number, widthPx: number, minPx = 56): number[] {
  if (count <= 0) return [];
  const slots = Math.max(1, Math.floor(widthPx / minPx));
  const every = Math.max(1, Math.ceil(count / slots));
  const out: number[] = [];
  for (let i = 0; i < count; i += every) out.push(i);
  return out;
}
