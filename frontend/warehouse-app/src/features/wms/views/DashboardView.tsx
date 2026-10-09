'use client';

import React, { useMemo, useState } from 'react';
import { Box, Button, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import {
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  CheckCircle as CheckCircleIcon,
  SwapVert as SwapVertIcon,
} from '@mui/icons-material';
import { type Page, type Product, type StockMovement, type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { PageId, Permissions } from '@/features/wms/permissions';
import { formatCount, formatCurrency, formatInt, formatSigned } from '@/features/wms/format';
import { formatDateTime, localeOf } from '@/features/wms/dates';
import { needsAttention, stockStatus } from '@/features/wms/productFilters';
import { sumFifo, listPriceValue } from '@/features/wms/valuation';
import { ActionButton, CardHeader, EmptyState, ErrorState, KpiCard, PageHeader, SectionCard, SkeletonRows, StatusChip, StockStatusChip, stickyActions } from '@/features/wms/components/Primitives';
import { MovementTrendChart, TopMovedList, TrendLegend } from '@/features/wms/components/MovementTrendChart';
import { buildDailySeries, isThinSeries, topMoved } from '@/features/wms/trend';

interface DashboardViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  productsQ: UseQueryResult<Product[], Error>;
  allMovementsQ: UseQueryResult<Page<StockMovement>, Error>;
  reportQ: UseQueryResult<StockReport[], Error>;
  onNavigate: (id: PageId) => void;
  onBook: (type: 'IN' | 'OUT', productId?: number) => void;
  onShowLowStock: () => void;
}

export function DashboardView({ t, lang, perms, productsQ, allMovementsQ, reportQ, onNavigate, onBook, onShowLowStock }: DashboardViewProps) {
  const products = productsQ.data;
  // fixed when the page opens, so the 30-day window does not shift on every re-render
  const [openedAt] = useState(() => Date.now());
  const movementPage = allMovementsQ.data;
  const movements = useMemo(() => movementPage?.content ?? [], [movementPage]);

  const stats = useMemo(() => {
    const active = (products ?? []).filter((p) => p.active);
    const attention = active
      .filter(needsAttention)
      .sort((a, b) => {
        const rank = (p: Product) => (stockStatus(p) === 'out' ? 0 : 1);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        const gap = (p: Product) => (p.reorderLevel ?? 0) - p.stock;
        return gap(b) - gap(a) || a.name.localeCompare(b.name);
      });
    const listValue = active.reduce((s, p) => s + (listPriceValue(p.stock, p.unitPrice) ?? 0), 0);
    return { active: active.length, attention, outCount: attention.filter((p) => p.stock <= 0).length, listValue };
  }, [products]);

  const series = useMemo(() => buildDailySeries(movements, new Date(openedAt), 30), [movements, openedAt]);
  const thin = isThinSeries(series);
  const ranked = useMemo(() => topMoved(movements, new Date(openedAt), 30, 5), [movements, openedAt]);

  const fifo = useMemo(
    () => sumFifo((reportQ.data ?? []).map((r) => ({ currentStock: r.currentStock, fifoValue: r.inventoryValue ?? 0 }))),
    [reportQ.data],
  );

  const partial = movementPage != null && movementPage.totalElements > movements.length;
  const today = new Date(openedAt).toLocaleDateString(localeOf(lang), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const productsLoading = productsQ.isLoading;
  const statusLabels = { out: t('outOfStock'), low: t('lowStock'), ok: t('statusOk') };
  const showAttentionCount = Math.min(stats.attention.length, 5);
  const net = series.totalIn - series.totalOut;

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('dashboard')}
        subtitle={today}
        actions={perms.canBookMovements ? (
          <>
            <Button variant="outlined" startIcon={<ArrowDownIcon />} onClick={() => onBook('OUT')}>{t('outboundPickup')}</Button>
            <Button variant="contained" startIcon={<ArrowUpIcon />} onClick={() => onBook('IN')}>{t('inboundDelivery')}</Button>
          </>
        ) : undefined}
      />

      {/* Six metrics in one row on wide screens; each says what it measures, value cards explain their formula */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: `repeat(${perms.canSeeFinancials ? 6 : 4}, minmax(0, 1fr))` }, alignItems: 'stretch' }}>
        <KpiCard label={t('kpiActiveProducts')} value={productsQ.isError ? '—' : formatInt(stats.active, lang)} loading={productsLoading} />
        <KpiCard
          label={t('kpiLowStock')}
          value={productsQ.isError ? '—' : formatInt(stats.attention.length, lang)}
          subtitle={productsQ.isError ? undefined : `${formatInt(stats.outCount, lang)} ${t('outOfStock').toLowerCase()}`}
          tone={stats.outCount > 0 ? 'error' : stats.attention.length > 0 ? 'warning' : 'neutral'}
          loading={productsLoading}
        />
        <KpiCard label={`${t('kpiIn')} · ${t('days30')}`} value={allMovementsQ.isError ? '—' : formatInt(series.totalIn, lang)} subtitle={t('stockWord')} loading={allMovementsQ.isLoading} />
        <KpiCard label={`${t('kpiOut')} · ${t('days30')}`} value={allMovementsQ.isError ? '—' : formatInt(series.totalOut, lang)} subtitle={t('stockWord')} loading={allMovementsQ.isLoading} />
        {perms.canSeeFinancials && (
          <>
            <KpiCard label={t('valueListPrice')} value={productsQ.isError ? '—' : formatCurrency(stats.listValue, lang)} hint={t('hintListValue')} hintLabel={t('hintListValue')} loading={productsLoading} />
            <KpiCard
              label={t('valueFifo')}
              value={reportQ.isError ? '—' : formatCurrency(fifo.total, lang)}
              subtitle={fifo.withoutCost > 0 ? t('fifoExcludedShort').replace('{n}', formatInt(fifo.withoutCost, lang)) : undefined}
              tone={fifo.withoutCost > 0 ? 'warning' : 'neutral'}
              hint={t('hintFifoValue')}
              hintLabel={t('hintFifoValue')}
              loading={reportQ.isLoading}
            />
          </>
        )}
      </Box>
      {partial && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
          {t('partialData').replace('{n}', formatInt(movements.length, lang)).replace('{total}', formatInt(movementPage?.totalElements, lang))}
        </Typography>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'stretch' }}>
        {/* Low stock: the list a warehouse manager acts on. Same height as the chart beside it. */}
        <SectionCard sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2 }}>
            <CardHeader
              title={`${t('attentionRequired')}${stats.attention.length > 0 ? ` (${formatInt(stats.attention.length, lang)})` : ''}`}
              action={stats.attention.length > showAttentionCount ? <Button size="small" onClick={onShowLowStock}>{t('viewAll')}</Button> : undefined}
            />
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderTop: '1px solid', borderColor: 'divider' }}>
            {productsLoading ? (
              <Table size="small"><TableBody><SkeletonRows cols={5} rows={5} /></TableBody></Table>
            ) : productsQ.isError ? (
              <ErrorState bare title={t('loadError')} message={productsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => productsQ.refetch()} retryLabel={t('retry')} />
            ) : stats.attention.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmptyState tone="success" icon={<CheckCircleIcon />} title={t('allClear')} message={t('allClearMsg')} />
              </Box>
            ) : (
              <Box sx={{ overflow: 'auto', flex: 1 }}>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('product')}</TableCell>
                      <TableCell align="right">{t('stock')}</TableCell>
                      <TableCell align="right">{t('reorderLevel')}</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      {perms.canBookMovements && <TableCell sx={stickyActions}>{t('actions')}</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.attention.slice(0, showAttentionCount).map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" fontWeight={500} noWrap title={p.name}>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap component="div">{p.articleNumber}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatInt(p.stock, lang)}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatInt(p.reorderLevel, lang)}</TableCell>
                        <TableCell><StockStatusChip status={stockStatus(p)} labels={statusLabels} /></TableCell>
                        {perms.canBookMovements && (
                          <TableCell sx={stickyActions}>
                            <ActionButton label={t('bookStockIn')} icon={<ArrowUpIcon fontSize="small" />} onClick={() => onBook('IN', p.id)} />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </SectionCard>

        {/* Stock in / out over 30 days as a line with a real axis; a ranked list when the month is too thin for a line */}
        <SectionCard sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CardHeader
            title={thin && !allMovementsQ.isLoading && movements.length > 0 ? t('topMovedProducts') : t('movementTrend')}
            subtitle={allMovementsQ.data && movements.length > 0 ? (thin ? t('thinDataNote') : `${t('last30Days')} · ${t('chartYAxis')} · ${t('netChange')}: ${formatSigned(net, lang)}`) : undefined}
            action={!thin && movements.length > 0 ? <TrendLegend inLabel={t('stockIn')} outLabel={t('stockOut')} /> : undefined}
          />
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: thin ? 'flex-start' : 'stretch' }}>
            {allMovementsQ.isError ? (
              <ErrorState bare title={t('loadError')} message={allMovementsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => allMovementsQ.refetch()} retryLabel={t('retry')} />
            ) : allMovementsQ.isLoading ? (
              <Skeleton variant="rounded" sx={{ flex: 1, minHeight: 200 }} />
            ) : movements.length === 0 ? (
              <EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} />
            ) : thin ? (
              ranked.length > 0
                ? <TopMovedList rows={ranked} lang={lang} inLabel={t('stockIn')} outLabel={t('stockOut')} />
                : <EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} />
            ) : (
              <Box sx={{ flex: 1, minHeight: 200 }}>
                <MovementTrendChart series={series} lang={lang} label={t('trendChartLabel')} inLabel={t('stockIn')} outLabel={t('stockOut')} />
              </Box>
            )}
          </Box>
        </SectionCard>
      </Box>

      {/* Recent movements */}
      <SectionCard>
        <Box sx={{ p: 2 }}>
          <CardHeader
            title={t('recentMovements')}
            subtitle={formatCount(movementPage?.totalElements ?? 0, t('unitMovements'), lang)}
            action={<Button size="small" onClick={() => onNavigate('movements')}>{t('viewAll')}</Button>}
          />
        </Box>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
          {allMovementsQ.isLoading ? (
            <Table size="small"><TableBody><SkeletonRows cols={5} rows={4} /></TableBody></Table>
          ) : allMovementsQ.isError ? (
            <ErrorState bare title={t('loadError')} message={allMovementsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => allMovementsQ.refetch()} retryLabel={t('retry')} />
          ) : movements.length === 0 ? (
            <EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} />
          ) : (
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell>{t('product')}</TableCell>
                  <TableCell>{t('type')}</TableCell>
                  <TableCell align="right">{t('quantity')}</TableCell>
                  <TableCell>{t('user')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.slice(0, 6).map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDateTime(m.occurredAt, lang)}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" fontWeight={500} noWrap>{m.productName}</Typography></TableCell>
                    <TableCell><StatusChip label={m.movementType === 'IN' ? t('stockIn') : t('stockOut')} tone={m.movementType === 'IN' ? 'primary' : 'neutral'} icon={m.movementType === 'IN' ? <ArrowUpIcon /> : <ArrowDownIcon />} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>{formatSigned(m.movementType === 'IN' ? m.quantity : -m.quantity, lang)}</TableCell>
                    <TableCell>{m.performedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </SectionCard>
    </Stack>
  );
}
