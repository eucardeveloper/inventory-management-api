'use client';

import React from 'react';
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, CheckCircle as CheckCircleIcon, Download as DownloadIcon, Inventory as InventoryIcon, PictureAsPdf as PdfIcon, Warning as WarningIcon } from '@mui/icons-material';
import { type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { CardHeader, EmptyState, ErrorState, KpiCard, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard } from '@/features/wms/components/Primitives';
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
  const lowCount = rows.filter((r) => r.isLowStock).length;
  const totalIn = rows.reduce((s, r) => s + r.totalIn, 0);
  const totalOut = rows.reduce((s, r) => s + r.totalOut, 0);
  const colCount = 6 + (showValue ? 1 : 0);

  const exportHeaders = [t('articleNumber'), t('productName'), t('totalIn'), t('totalOut'), t('currentStock'), ...(showValue ? [t('fifoValue')] : []), t('reorderLevel'), t('status')];
  const exportRows = rows.map((r) => [
    r.articleNumber, r.productName, String(r.totalIn), String(r.totalOut), String(r.currentStock),
    ...(showValue ? [r.fifoValue.toFixed(2)] : []),
    String(r.reorderLevel ?? ''), r.isLowStock ? t('lowStock') : t('ok'),
  ]);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('stockReport')}
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
            <KpiCard label={t('kpiTotalProducts')} value={rows.length} icon={<InventoryIcon />} tone="primary" loading={reportQ.isLoading} />
            <KpiCard label={t('kpiLowStock')} value={lowCount} icon={<WarningIcon />} tone={lowCount > 0 ? 'warning' : 'success'} loading={reportQ.isLoading} />
            {showValue && (
              <KpiCard label={t('fifoValue')} value={formatCurrency(rows.reduce((s, r) => s + r.fifoValue, 0), lang)} icon={<AssessmentIcon />} tone="success" loading={reportQ.isLoading} />
            )}
          </Box>

          {!showValue && <Typography variant="caption" color="text.secondary">{t('costHiddenHint')}</Typography>}

          {rows.length > 0 && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <SectionCard>
                <CardHeader title={t('inOutBalance')} />
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
                <CardHeader title={t('stockStatus')} />
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <PieChart
                    title={t('stockStatus')}
                    size={190}
                    slices={[
                      { label: t('normalStock'), value: rows.length - lowCount, color: '#2563eb' },
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
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>{r.totalIn}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{r.totalOut}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{r.currentStock}</TableCell>
                      {showValue && <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatCurrency(r.fifoValue, lang)}</TableCell>}
                      <TableCell>
                        {r.isLowStock
                          ? <StatusChip label={t('lowStock')} tone="warning" icon={<WarningIcon />} />
                          : <StatusChip label={t('ok')} tone="success" icon={<CheckCircleIcon />} />}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableCard>
        </>
      )}
    </Stack>
  );
}
