'use client';

import React, { useMemo, useState } from 'react';
import { Box, Button, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import {
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  Paid as PaidIcon,
  SwapVert as SwapVertIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { type Page, type Product, type StockMovement, type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { PageId, Permissions } from '@/features/wms/permissions';
import { formatCount, formatCurrency, formatInt, formatSigned } from '@/features/wms/format';
import { formatDateTime, localeOf, parseApiDate } from '@/features/wms/dates';
import { needsAttention, stockStatus } from '@/features/wms/productFilters';
import { sumFifo, listPriceValue } from '@/features/wms/valuation';
import { ActionButton, CardHeader, EmptyState, ErrorState, KpiCard, PageHeader, SectionCard, SkeletonRows, StatusChip, StockStatusChip, TableCard, stickyActions } from '@/features/wms/components/Primitives';
import { MovementTrendChart } from '@/features/wms/components/MovementTrendChart';

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

const DAY_MS = 24 * 60 * 60 * 1000;

export function DashboardView({ t, lang, perms, productsQ, allMovementsQ, reportQ, onNavigate, onBook, onShowLowStock }: DashboardViewProps) {
  const products = productsQ.data;
  // fixed when the page opens, so the 30-day window does not shift on every re-render
  const [openedAt] = useState(() => Date.now());
  const movementPage = allMovementsQ.data;

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
    const since = openedAt - 30 * DAY_MS;
    let in30 = 0;
    let out30 = 0;
    let count30 = 0;
    for (const m of movementPage?.content ?? []) {
      const d = parseApiDate(m.occurredAt);
      if (!d || d.getTime() < since) continue;
      count30 += 1;
      if (m.movementType === 'IN') in30 += m.quantity;
      else out30 += m.quantity;
    }
    const listValue = active.reduce((s, p) => s + (listPriceValue(p.stock, p.unitPrice) ?? 0), 0);
    return { active: active.length, attention, outCount: attention.filter((p) => p.stock <= 0).length, in30, out30, count30, listValue };
  }, [products, movementPage, openedAt]);

  const fifo = useMemo(
    () => sumFifo((reportQ.data ?? []).map((r) => ({ currentStock: r.currentStock, fifoValue: r.inventoryValue ?? 0 }))),
    [reportQ.data],
  );

  const movements = movementPage?.content ?? [];
  const partial = movementPage != null && movementPage.totalElements > movements.length;
  const today = new Date().toLocaleDateString(localeOf(lang), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const productsLoading = productsQ.isLoading;
  const statusLabels = { out: t('outOfStock'), low: t('lowStock'), ok: t('statusOk') };
  const showAttentionCount = Math.min(stats.attention.length, 8);

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('dashboard')}
        subtitle={today}
        actions={perms.canBookMovements ? (
          <>
            <Button variant="contained" startIcon={<ArrowUpIcon />} onClick={() => onBook('IN')}>{t('inboundDelivery')}</Button>
            <Button variant="outlined" startIcon={<ArrowDownIcon />} onClick={() => onBook('OUT')}>{t('outboundPickup')}</Button>
          </>
        ) : undefined}
      />

      {productsQ.isError && (
        <ErrorState title={t('loadError')} message={productsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => productsQ.refetch()} retryLabel={t('retry')} />
      )}

      {/* Metrics: each card says what it measures; value cards explain their formula */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: `repeat(${perms.canSeeFinancials ? 6 : 4}, minmax(0, 1fr))` }, alignItems: 'stretch' }}>
        <KpiCard label={t('kpiActiveProducts')} value={formatInt(stats.active, lang)} icon={<InventoryIcon />} tone="primary" loading={productsLoading} />
        <KpiCard
          label={t('kpiLowStock')}
          value={formatInt(stats.attention.length, lang)}
          subtitle={`${formatInt(stats.outCount, lang)} ${t('outOfStock').toLowerCase()}`}
          icon={<WarningIcon />}
          tone={stats.attention.length > 0 ? 'warning' : 'success'}
          loading={productsLoading}
        />
        <KpiCard label={`${t('kpiIn')} · ${t('days30')}`} value={formatInt(stats.in30, lang)} subtitle={t('stockWord')} icon={<ArrowUpIcon />} tone="success" loading={allMovementsQ.isLoading} />
        <KpiCard label={`${t('kpiOut')} · ${t('days30')}`} value={formatInt(stats.out30, lang)} subtitle={t('stockWord')} icon={<ArrowDownIcon />} tone="info" loading={allMovementsQ.isLoading} />
        {perms.canSeeFinancials && (
          <>
            <KpiCard label={t('valueListPrice')} value={formatCurrency(stats.listValue, lang)} icon={<PaidIcon />} tone="neutral" hint={t('hintListValue')} hintLabel={t('hintListValue')} loading={productsLoading} />
            <KpiCard
              label={t('valueFifo')}
              value={reportQ.isError ? '—' : formatCurrency(fifo.total, lang)}
              subtitle={fifo.withoutCost > 0 ? t('fifoExcludedShort').replace('{n}', formatInt(fifo.withoutCost, lang)) : undefined}
              icon={<AssessmentIcon />}
              tone="primary"
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

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'stretch' }}>
        {/* Low stock: the list a warehouse manager acts on. Same height as the chart beside it. */}
        <SectionCard sx={{ display: 'flex', flexDirection: 'column', minHeight: 340 }}>
          <Box sx={{ p: 2.5, pb: 1.5 }}>
            <CardHeader
              title={`${t('attentionRequired')}${stats.attention.length > 0 ? ` (${formatInt(stats.attention.length, lang)})` : ''}`}
              action={stats.attention.length > showAttentionCount ? <Button size="small" onClick={onShowLowStock}>{t('viewAll')}</Button> : undefined}
            />
          </Box>
          {productsLoading ? (
            <Table size="small"><TableBody><SkeletonRows cols={5} rows={4} /></TableBody></Table>
          ) : stats.attention.length === 0 ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
              <EmptyState icon={<CheckCircleIcon />} title={t('allClear')} message={t('statusOk')} />
            </Box>
          ) : (
            <Box sx={{ overflow: 'auto', borderTop: '1px solid', borderColor: 'divider', flex: 1 }}>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('product')}</TableCell>
                    <TableCell align="right">{t('stock')}</TableCell>
                    <TableCell align="right">{t('reorderLevel')}</TableCell>
                    <TableCell align="right">{t('shortfall')}</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    {perms.canBookMovements && <TableCell sx={stickyActions}>{t('actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.attention.slice(0, showAttentionCount).map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={p.name}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ fontFamily: 'monospace' }}>{p.articleNumber}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatInt(p.stock, lang)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatInt(p.reorderLevel, lang)}</TableCell>
                      <TableCell align="right">{p.reorderLevel != null ? formatInt(Math.max(0, p.reorderLevel - p.stock), lang) : '—'}</TableCell>
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
        </SectionCard>

        {/* Daily stock in / out with a real axis, so the chart answers "is stock flowing in or out?" */}
        <SectionCard sx={{ p: 2.5, display: 'flex', flexDirection: 'column', minHeight: 340 }}>
          <CardHeader
            title={`${t('movementTrend')} · ${t('last30Days')}`}
            subtitle={allMovementsQ.data ? `${t('netChange')}: ${formatSigned(stats.in30 - stats.out30, lang)} ${t('stockWord')}` : undefined}
            action={
              <Stack direction="row" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={0.75}><Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#16a34a' }} /><Typography variant="caption">{t('stockIn')}</Typography></Stack>
                <Stack direction="row" alignItems="center" spacing={0.75}><Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#dc2626' }} /><Typography variant="caption">{t('stockOut')}</Typography></Stack>
              </Stack>
            }
          />
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {allMovementsQ.isError ? (
              <ErrorState title={t('loadError')} message={allMovementsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => allMovementsQ.refetch()} retryLabel={t('retry')} />
            ) : allMovementsQ.isLoading ? (
              <Skeleton height={240} />
            ) : movements.length === 0 ? (
              <EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} />
            ) : (
              <Box sx={{ flex: 1, minHeight: 240 }}>
                <MovementTrendChart movements={movements} lang={lang} label={t('trendChartLabel')} inLabel={t('stockIn')} outLabel={t('stockOut')} />
              </Box>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>{t('chartYAxis')}</Typography>
        </SectionCard>
      </Box>

      {/* Recent movements */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6">{t('recentMovements')}</Typography>
          <Button size="small" onClick={() => onNavigate('movements')}>{t('viewAll')}</Button>
        </Stack>
        {allMovementsQ.isLoading ? (
          <TableCard><Table size="small"><TableBody><SkeletonRows cols={5} rows={3} /></TableBody></Table></TableCard>
        ) : movements.length === 0 ? (
          <SectionCard><EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} /></SectionCard>
        ) : (
          <TableCard>
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
                    <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" fontWeight={600} noWrap>{m.productName}</Typography></TableCell>
                    <TableCell><StatusChip label={m.movementType === 'IN' ? t('stockIn') : t('stockOut')} tone={m.movementType === 'IN' ? 'success' : 'error'} icon={m.movementType === 'IN' ? <ArrowUpIcon /> : <ArrowDownIcon />} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatSigned(m.movementType === 'IN' ? m.quantity : -m.quantity, lang)}</TableCell>
                    <TableCell>{m.performedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {formatCount(movementPage?.totalElements ?? 0, t('unitMovements'), lang)}
        </Typography>
      </Box>
    </Stack>
  );
}
