'use client';

import React, { useMemo, useState } from 'react';
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, Clear as ClearIcon, Download as DownloadIcon, Info as InfoIcon, PictureAsPdf as PdfIcon, Search as SearchIcon, SearchOff as SearchOffIcon } from '@mui/icons-material';
import { type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCount, formatCurrency, formatInt } from '@/features/wms/format';
import { stockStatus } from '@/features/wms/productFilters';
import { fifoCostState, sumFifo } from '@/features/wms/valuation';
import { EmptyState, ErrorState, KpiCard, PageHeader, SectionCard, SkeletonRows, SplitBar, StatusChip, StockStatusChip, TableCard, TableToolbar } from '@/features/wms/components/Primitives';
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
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.productName.toLowerCase().includes(q) || r.articleNumber.toLowerCase().includes(q)) : rows;
  }, [rows, query]);
  const activeRows = rows.filter((r) => r.active);
  const outCount = activeRows.filter((r) => stockStatus({ stock: r.currentStock, reorderLevel: r.reorderLevel }) === 'out').length;
  const lowCount = activeRows.filter((r) => stockStatus({ stock: r.currentStock, reorderLevel: r.reorderLevel }) === 'low').length;
  const attentionCount = outCount + lowCount;
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

  const toolbar = (
    <TableToolbar count={reportQ.data ? (query.trim() ? `${formatInt(shown.length, lang)} ${t('ofLabel')} ${formatCount(rows.length, t('unitProducts'), lang)}` : formatCount(rows.length, t('unitProducts'), lang)) : undefined}>
      <TextField
        placeholder={t('searchReportPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        inputProps={{ 'aria-label': t('search') }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label={t('clearFilters')} onClick={() => setQuery('')}><ClearIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        sx={{ width: 320, maxWidth: '100%' }}
      />
    </TableToolbar>
  );

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('stockReport')}
        subtitle={t('subReport')}
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
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${showValue ? 4 : 3}, minmax(0, 1fr))` } }}>
            <KpiCard label={t('kpiTotalProducts')} value={formatInt(rows.length, lang)} loading={reportQ.isLoading} />
            <KpiCard label={t('kpiLowStock')} value={formatInt(attentionCount, lang)} subtitle={`${formatInt(outCount, lang)} ${t('outOfStock').toLowerCase()}`} tone={outCount > 0 ? 'error' : attentionCount > 0 ? 'warning' : 'neutral'} loading={reportQ.isLoading} />
            <KpiCard label={t('totalIn')} value={formatInt(totalIn, lang)} subtitle={`${t('totalOut')}: ${formatInt(totalOut, lang)}`} loading={reportQ.isLoading} />
            {showValue && (
              <KpiCard
                label={t('valueFifo')}
                value={formatCurrency(fifo.total, lang)}
                subtitle={fifo.withoutCost > 0 ? t('fifoExcludedShort').replace('{n}', formatInt(fifo.withoutCost, lang)) : undefined}
                tone={fifo.withoutCost > 0 ? 'warning' : 'neutral'}
                hint={t('hintFifoValue')}
                hintLabel={t('hintFifoValue')}
                loading={reportQ.isLoading}
              />
            )}
          </Box>

          {!showValue && <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>{t('costHiddenHint')}</Typography>}

          {rows.length > 0 && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <SplitBar
                title={t('inOutBalance')}
                formatValue={(n) => formatInt(n, lang)}
                segments={[
                  { label: t('totalIn'), value: totalIn, color: '#2563eb' },
                  { label: t('totalOut'), value: totalOut, color: '#94a3b8' },
                ]}
              />
              <SplitBar
                title={t('stockStatus')}
                formatValue={(n) => formatInt(n, lang)}
                segments={[
                  { label: t('statusOk'), value: activeRows.length - attentionCount, color: '#16a34a' },
                  { label: t('lowStock'), value: lowCount, color: '#d97706' },
                  { label: t('outOfStock'), value: outCount, color: '#dc2626' },
                ]}
              />
            </Box>
          )}

          {!reportQ.isLoading && shown.length === 0 ? (
            <SectionCard>
              {toolbar}
              <EmptyState icon={<SearchOffIcon />} title={t('noResults')} message={t('noResultsMsg')} action={<Button variant="outlined" onClick={() => setQuery('')}>{t('clearFilters')}</Button>} />
            </SectionCard>
          ) : (
          <TableCard toolbar={toolbar}>
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
                  shown.map((r) => (
                    <TableRow key={r.productId} hover>
                      <TableCell sx={{ maxWidth: { xs: 160, sm: 300 } }}><Typography variant="body2" fontWeight={500} noWrap>{r.productName}</Typography></TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{r.articleNumber}</TableCell>
                      <TableCell align="right" >{formatInt(r.totalIn, lang)}</TableCell>
                      <TableCell align="right" >{formatInt(r.totalOut, lang)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{formatInt(r.currentStock, lang)}</TableCell>
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
          )}
        </>
      )}
    </Stack>
  );
}
