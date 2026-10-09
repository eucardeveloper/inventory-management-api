// Two different stock-value metrics exist and must never be shown as the same number:
//  - list-price value = available stock x list price (unit price). A selling-price view, not accounting cost.
//  - FIFO value       = sum over the remaining units of each lot x that lot's unit cost (computed by the API).
// A product with stock on hand but a FIFO value of 0 has no cost record (typical for demo data that
// was never booked through a goods receipt); showing EUR 0.00 would be misleading, so it is flagged.

export type CostState = 'value' | 'none' | 'empty';

export function fifoCostState(stock: number, fifoValue: number | null | undefined): CostState {
  if (stock <= 0) return 'empty';
  return fifoValue != null && fifoValue > 0 ? 'value' : 'none';
}

export function listPriceValue(stock: number, unitPrice: number | null | undefined): number | null {
  return unitPrice == null ? null : stock * unitPrice;
}

/** Total FIFO value and the number of products with stock but no cost record (excluded from the total). */
export function sumFifo(rows: Array<{ currentStock: number; fifoValue: number }>): { total: number; withoutCost: number } {
  let total = 0;
  let withoutCost = 0;
  for (const r of rows) {
    const state = fifoCostState(r.currentStock, r.fifoValue);
    if (state === 'value') total += r.fifoValue;
    else if (state === 'none') withoutCost += 1;
  }
  return { total, withoutCost };
}

/**
 * Cost shown for a stock movement. The API reports 0 when no unit cost is on record (for example demo
 * data booked without one); presenting that as EUR 0.00 would read as a real cost, so it is flagged.
 */
export function movementCostState(totalCost: number | null | undefined): 'value' | 'none' {
  return totalCost != null && totalCost > 0 ? 'value' : 'none';
}
