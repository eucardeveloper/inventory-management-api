import type { StockMovement } from '../../hooks/useInventoryQueries.ts';
import { movementCostState } from './valuation.ts';

export interface MovementExportLabels {
  date: string; articleNumber: string; product: string; type: string; quantity: string;
  cost: string; stockAfter: string; user: string; reasonCode: string;
  stockIn: string; stockOut: string; reversal: string; reversed: string;
}

/**
 * One flat row per movement for CSV/Excel. Dates are ISO (sortable in a spreadsheet), the quantity
 * is signed, and the cost column is left out entirely for roles that may not see costs.
 */
export function movementExportRows(rows: StockMovement[], l: MovementExportLabels, showCost: boolean): Record<string, unknown>[] {
  return rows.map((m) => {
    const flags = [m.reversalOfId ? l.reversal : '', m.reversedById ? l.reversed : ''].filter(Boolean).join(', ');
    const row: Record<string, unknown> = {
      [l.date]: m.occurredAt,
      [l.articleNumber]: m.articleNumber,
      [l.product]: m.productName,
      [l.type]: (m.movementType === 'IN' ? l.stockIn : l.stockOut) + (flags ? ` (${flags})` : ''),
      [l.quantity]: m.movementType === 'IN' ? m.quantity : -m.quantity,
    };
    if (showCost) row[l.cost] = movementCostState(m.totalCost) === 'value' ? m.totalCost : ''; // same rule as the screen: no cost on record is blank, never 0
    row[l.stockAfter] = m.stockAfter;
    row[l.user] = m.performedBy;
    row[l.reasonCode] = m.reasonCode ?? '';
    return row;
  });
}
