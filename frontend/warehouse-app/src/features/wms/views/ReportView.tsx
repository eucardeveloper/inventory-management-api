'use client';

import React from 'react';
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, Download as DownloadIcon, Info as InfoIcon, Inventory as InventoryIcon, PictureAsPdf as PdfIcon, Warning as WarningIcon } from '@mui/icons-material';
import { type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCount, formatCurrency, formatInt } from '@/features/wms/format';
import { stockStatus } from '@/features/wms/productFilters';
import { fifoCostState, sumFifo } from '@/features/wms/valuation';
import { EmptyState, ErrorState, KpiCard, PageHeader, SectionCard, SkeletonRows, StatusChip, StockStatusChip, TableCard } from '@/features/wms/components/Primitives';
import { PieChart } from '@/features/wms/components/PieChart';
import { exportExcel, exportPdf } from '@/features/wms/exporters';

export interface ReportRow {
  fifoValue: number;
  productId: number;
  productName: string;
  articleNumber: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  reorderLevel?: number;
  isLowStock: boolean;
  /** False for deactivated products (they keep their stock value but are not counted as low stock). */
  active: boolean;
}

interface ReportViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  rows: ReportRow[];
  reportQ: UseQueryResult<StockReport[], Error>;
}

export function ReportView({ t, lang, perms, rows, reportQ }: ReportViewProps) {
  const showValue = perms.canSeeFinancials;
  const lowCount = rows.filter((r) => r.active && stockStatus({ stock: r.currentStock, reorderLevel: r.reorderLevel }) !== 'ok').length;
  const totalIn = rows.reduce((s, r) => s + r.totalIn, 0);
  const totalOut = rows.reduce((s, r) => s + r.totalOut, 0);
  const colCount = 6 + (showValue ? 1 : 0);
  const fifo = sumFifo(rows);
  const statusLabels = { out: t('outOfStock'), low: t('lowStock'), ok: t('statusOk') };

  const exportHeaders = [t('articleNumber'), t('productName'), t('totalIn'), t('totalOut'), t('currentStock'), ...(showValue ? [t('fifoValue')] : []), t('reorderLevel'), t('status')];
  const exportRows = rows.map((r) => [
    r.articleNumber, r.productName, String(r.totalIn), String(r.totalOut), String(r.currentStock),
    ...(showValue ? [fifoCostState(r.currentStock, r.fifoValue) === 'none' ? t('noCostRecord') : r.fifoValue.toFixed(2)] : []),
    String(r.reorderLevel ?? ''), statusLabels[stockStatus({ stock: r.currentStock, reorderLevel: r.reorderLevel })],
  ]);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('stockReport')}
        subtitle={reportQ.data ? formatCount(rows.length, t('unitProducts'), lang) : undefined}
        actions={rows.length > 0 ? (
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportExcel(
              rows.map((_, idx) => Object.fromEntries(exportHeaders.map((h, i) => [h, exportRows[idx][i]]))),
              'stock-report',
            )}>Excel</Button>
            <Button variant="outlined" startIcon={<PdfIcon />} onClick={() => exportPdf(t('stockReport'), exportHeaders, exportRows)}>PDF</Button>
          </>
        ) : undefined}
      />

      {reportQ.isError ? (
        <ErrorState title={t('loadError')} message={reportQ.error?.message ?? t('loadErrorMsg')} onRetry={() => reportQ.refetch()} retryLabel={t('retry')} />
      ) : !reportQ.isLoading && rows.length === 0 ? (
        <SectionCard>
          <EmptyState icon={<AssessmentIcon />} title={t('noReport')} message={t('noReportMsg')} />
        </SectionCard>
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: showValue ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' } }}>
            <KpiCard label={t('kpiTotalProducts')} value={formatInt(rows.length, lang)} icon={<InventoryIcon />} tone="primary" loading={reportQ.isLoading} />
            <KpiCard label={t('kpiLowStock')} value={formatInt(lowCount, lang)} icon={<WarningIcon />} tone={lowCount > 0 ? 'warning' : 'success'} loading={reportQ.isLoading} />
            {showValue && (
              <KpiCard
                label={t('valueFifo')}
                value={formatCurrency(fifo.total, lang)}
                subtitle={fifo.withoutCost > 0 ? t('fifoExcluded').replace('{n}', formatInt(fifo.withoutCost, lang)) : undefined}
                icon={<AssessmentIcon />}
                tone="success"
                hint={t('hintFifoValue')}
                hintLabel={t('hintFifoValue')}
                loading={reportQ.isLoading}
              />
            )}
          </Box>

          {!showValue && <Typography variant="caption" color="text.secondary">{t('costHiddenHint')}</Typography>}

          {rows.length > 0 && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <SectionCard>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <PieChart
                    title={t('inOutBalance')}
                    donut
                    size={190}
                    slices={[
                      { label: t('totalIn'), value: totalIn, color: '#16a34a' },
                      { label: t('totalOut'), value: totalOut, color: '#dc2626' },
                    ].filter((s) => s.value > 0)}
                  />
                </Box>
              </SectionCard>
              <SectionCard>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <PieChart
                    title={t('stockStatus')}
                    size={190}
                    slices={[
                      { label: t('normalStock'), value: rows.filter((r) => r.active).length - lowCount, color: '#2563eb' },
                      { label: t('lowStock'), value: lowCount, color: '#d97706' },
                    ].filter((s) => s.value > 0)}
                  />
                </Box>
              </SectionCard>
            </Box>
          )}

          <TableCard>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('product')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('articleNumber')}</TableCell>
                  <TableCell align="right">{t('totalIn')}</TableCell>
                  <TableCell align="right">{t('totalOut')}</TableCell>
                  <TableCell align="right">{t('currentStock')}</TableCell>
                  {showValue && <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('fifoValue')}</TableCell>}
                  <TableCell>{t('status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportQ.isLoading ? (
                  <SkeletonRows cols={colCount} />
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.productId} hover>
                      <TableCell sx={{ maxWidth: { xs: 160, sm: 300 } }}><Typography variant="body2" fontWeight={600} noWrap>{r.productName}</Typography></TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.articleNumber}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>{formatInt(r.totalIn, lang)}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{formatInt(r.totalOut, lang)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatInt(r.currentStock, lang)}</TableCell>
                      {showValue && (
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}>
                          {fifoCostState(r.currentStock, r.fifoValue) === 'none' ? (
                            <Tooltip title={t('noCostRecordHint')}><span><StatusChip label={t('noCostRecord')} tone="warning" icon={<InfoIcon />} /></span></Tooltip>
                          ) : formatCurrency(r.fifoValue, lang)}
                        </TableCell>
                      )}
                      <TableCell>{r.active ? <StockStatusChip status={stockStatus({ stock: r.currentStock, reorderLevel: r.reorderLevel })} labels={statusLabels} /> : <StatusChip label={t('inactive')} tone="neutral" />}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableCard>
          {showValue && <Typography variant="caption" color="text.secondary">{t('hintFifoValue')}</Typography>}
        </>
      )}
    </Stack>
  );
}
