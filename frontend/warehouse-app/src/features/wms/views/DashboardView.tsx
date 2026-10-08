'use client';

import React from 'react';
import { Box, Button, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import {
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  SwapHoriz as SwapHorizIcon,
  SwapVert as SwapVertIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { type Page, type Product, type StockMovement } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { PageId, Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { formatDateTime, localeOf } from '@/features/wms/dates';
import { CardHeader, EmptyState, ErrorState, KpiCard, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard } from '@/features/wms/components/Primitives';
import { PieChart } from '@/features/wms/components/PieChart';
import { MovementTrendChart } from '@/features/wms/components/MovementTrendChart';

export interface DashboardKpis {
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  totalIn: number;
  totalOut: number;
  totalValue: number;
  todayMovements: number;
  criticalStock: number;
}

interface DashboardViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  kpiData: DashboardKpis;
  perms: Permissions;
  productsQ: UseQueryResult<Product[], Error>;
  allMovementsQ: UseQueryResult<Page<StockMovement>, Error>;
  onNavigate: (id: PageId) => void;
  onBook: (type: 'IN' | 'OUT') => void;
}

export function DashboardView({ t, lang, kpiData, perms, productsQ, allMovementsQ, onNavigate, onBook }: DashboardViewProps) {
  const movements = allMovementsQ.data?.content ?? [];
  const attention = (productsQ.data ?? []).filter((p) => p.active && p.reorderLevel != null && p.stock <= p.reorderLevel);
  const productsLoading = productsQ.isLoading;
  const today = new Date().toLocaleDateString(localeOf(lang), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
        <ErrorState
          title={t('loadError')}
          message={productsQ.error?.message ?? t('loadErrorMsg')}
          onRetry={() => productsQ.refetch()}
          retryLabel={t('retry')}
        />
      )}

      {/* KPI cards */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <KpiCard label={t('kpiTotalProducts')} value={kpiData.totalProducts} icon={<InventoryIcon />} tone="primary" loading={productsLoading} />
        <KpiCard label={t('kpiActiveProducts')} value={kpiData.activeProducts} icon={<CheckCircleIcon />} tone="success" loading={productsLoading} />
        <KpiCard label={t('kpiLowStock')} value={kpiData.lowStock} icon={<WarningIcon />} tone={kpiData.lowStock > 0 ? 'warning' : 'success'} loading={productsLoading} />
        <KpiCard label={t('todayMovements')} value={kpiData.todayMovements} icon={<SwapHorizIcon />} tone="primary" loading={allMovementsQ.isLoading} />
        {perms.canSeeFinancials && (
          <KpiCard label={t('kpiTotalStockValue')} value={formatCurrency(kpiData.totalValue, lang)} icon={<AssessmentIcon />} tone="info" loading={productsLoading} />
        )}
      </Box>

      {/* Attention required */}
      {attention.length > 0 && (
        <SectionCard sx={{ p: 2.5, borderColor: 'warning.main' }}>
          <CardHeader
            title={`${t('attentionRequired')} (${attention.length})`}
            action={<Button size="small" onClick={() => onNavigate('products')}>{t('products')}</Button>}
          />
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
            {attention.slice(0, 6).map((p) => (
              <Stack
                key={p.id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                onClick={() => onNavigate('products')}
                sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px', cursor: 'pointer', minWidth: 0, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: p.stock === 0 ? 'error.main' : 'warning.main' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">{p.articleNumber}</Typography>
                </Box>
                <StatusChip label={`${p.stock} / ${p.reorderLevel}`} tone={p.stock === 0 ? 'error' : 'warning'} />
              </Stack>
            ))}
          </Box>
          {attention.length > 6 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              +{attention.length - 6} {t('more')}
            </Typography>
          )}
        </SectionCard>
      )}

      {/* Charts */}
      {allMovementsQ.isError ? (
        <ErrorState
          title={t('loadError')}
          message={allMovementsQ.error?.message ?? t('loadErrorMsg')}
          onRetry={() => allMovementsQ.refetch()}
          retryLabel={t('retry')}
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 2fr)' } }}>
          <SectionCard sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {allMovementsQ.isLoading ? (
              <Skeleton variant="circular" width={180} height={180} />
            ) : movements.length === 0 ? (
              <EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} />
            ) : (
              <PieChart
                title={t('inOutBalance')}
                donut
                size={190}
                slices={[
                  { label: t('stockIn'), value: kpiData.totalIn, color: '#16a34a' },
                  { label: t('stockOut'), value: kpiData.totalOut, color: '#dc2626' },
                ].filter((s) => s.value > 0)}
              />
            )}
          </SectionCard>
          <SectionCard sx={{ p: 2.5 }}>
            <CardHeader
              title={t('movementTrend')}
              subtitle={t('loadedLast200')}
              action={
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={0.5}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#16a34a' }} /><Typography variant="caption" color="text.secondary">{t('stockIn')}</Typography></Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#dc2626' }} /><Typography variant="caption" color="text.secondary">{t('stockOut')}</Typography></Stack>
                </Stack>
              }
            />
            {allMovementsQ.isLoading ? <Skeleton height={200} /> : <MovementTrendChart movements={movements} lang={lang} />}
          </SectionCard>
        </Box>
      )}

      {/* Recent movements */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6">{t('recentMovements')}</Typography>
          <Button size="small" onClick={() => onNavigate('movements')}>{t('movements')}</Button>
        </Stack>
        {allMovementsQ.isLoading ? (
          <TableCard>
            <Table size="small"><TableBody><SkeletonRows cols={5} rows={3} /></TableBody></Table>
          </TableCard>
        ) : movements.length === 0 ? (
          <SectionCard>
            <EmptyState icon={<SwapVertIcon />} title={t('noMovements')} message={t('noMovementsMsg')} />
          </SectionCard>
        ) : (
          <TableCard>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('product')}</TableCell>
                  <TableCell>{t('type')}</TableCell>
                  <TableCell align="right">{t('quantity')}</TableCell>
                  <TableCell>{t('user')}</TableCell>
                  <TableCell>{t('date')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.slice(0, 5).map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 260 }}><Typography variant="body2" fontWeight={600} noWrap>{m.productName}</Typography></TableCell>
                    <TableCell><StatusChip label={m.movementType === 'IN' ? t('stockIn') : t('stockOut')} tone={m.movementType === 'IN' ? 'success' : 'error'} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{m.movementType === 'IN' ? '+' : '−'}{m.quantity}</TableCell>
                    <TableCell>{m.performedBy}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDateTime(m.occurredAt, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </Box>
    </Stack>
  );
}
