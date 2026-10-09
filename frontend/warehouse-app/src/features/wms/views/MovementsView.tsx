'use client';

import React from 'react';
import { Autocomplete, Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, InfoOutlined as InfoIcon, ArrowDownward as ArrowDownIcon, ArrowUpward as ArrowUpIcon, SwapVert as SwapVertIcon, Undo as UndoIcon } from '@mui/icons-material';
import { type Product, type StockMovement, type Page } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCount, formatCurrency, formatInt, formatSigned } from '@/features/wms/format';
import { formatDateTime } from '@/features/wms/dates';
import { movementCostState } from '@/features/wms/valuation';
import { ActionButton, EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, TableToolbar, stickyActions } from '@/features/wms/components/Primitives';

export const MOVEMENT_PAGE_SIZE = 50;

interface MovementsViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  productsQ: UseQueryResult<Product[], Error>;
  movementsQ: UseQueryResult<Page<StockMovement>, Error>;
  productFilter: number | '';
  onProductFilter: (id: number | '') => void;
  page: number;
  onPage: (p: number) => void;
  onBook: () => void;
  onReverse: (m: StockMovement) => void;
}

export function MovementsView({ t, lang, perms, productsQ, movementsQ, productFilter, onProductFilter, page, onPage, onBook, onReverse }: MovementsViewProps) {
  const rows = movementsQ.data?.content ?? [];
  const products = productsQ.data ?? [];
  const selected = products.find((p) => p.id === productFilter) ?? null;
  const showCost = perms.canSeeFinancials;
  const showActions = perms.canReverseMovements;
  const colCount = 6 + (showCost ? 1 : 0) + (showActions ? 1 : 0);

  const toolbar = (
    <TableToolbar count={movementsQ.data ? formatCount(movementsQ.data.totalElements, t('unitMovements'), lang) : undefined}>
      <Autocomplete
        options={products}
        value={selected}
        onChange={(_, v) => onProductFilter(v ? v.id : '')}
        getOptionLabel={(p) => `${p.name} (${p.articleNumber})`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => <TextField {...params} label={t('product')} InputLabelProps={{ ...params.InputLabelProps, shrink: true }} placeholder={t('all')} />}
        sx={{ width: 360, maxWidth: '100%' }}
      />
      {productFilter !== '' && (
        <Button variant="text" onClick={() => onProductFilter('')}>{t('clearFilters')}</Button>
      )}
    </TableToolbar>
  );

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('movements')}
        subtitle={t('subMovements')}
        actions={perms.canBookMovements ? <Button variant="contained" startIcon={<AddIcon />} onClick={onBook}>{t('recordMovement')}</Button> : undefined}
      />

      {movementsQ.isError ? (
        <ErrorState title={t('loadError')} message={movementsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => movementsQ.refetch()} retryLabel={t('retry')} />
      ) : !movementsQ.isLoading && rows.length === 0 ? (
        <SectionCard>
          {productFilter !== '' && toolbar}
          <EmptyState
            icon={<SwapVertIcon />}
            title={t('noMovements')}
            message={t('noMovementsMsg')}
            action={perms.canBookMovements ? <Button variant="contained" startIcon={<AddIcon />} onClick={onBook}>{t('recordMovement')}</Button> : undefined}
          />
        </SectionCard>
      ) : (
        <TableCard toolbar={toolbar}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('product')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell align="right">{t('quantity')}</TableCell>
                {showCost && (
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                      <span>{t('cost')}</span>
                      <Tooltip title={t('movementCostHint')} enterTouchDelay={0}>
                        <IconButton size="small" aria-label={t('movementCostHint')} sx={{ p: 0.25 }}><InfoIcon sx={{ fontSize: 16 }} /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                )}
                <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('stockAfter')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('user')}</TableCell>
                <TableCell>{t('date')}</TableCell>
                {showActions && <TableCell sx={stickyActions}>{t('actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {movementsQ.isLoading ? (
                <SkeletonRows cols={colCount} />
              ) : (
                rows.map((m) => {
                  const reversed = Boolean(m.reversedById);
                  const isReversal = Boolean(m.reversalOfId);
                  return (
                    <TableRow key={m.id} hover sx={{ opacity: reversed ? 0.6 : 1 }}>
                      <TableCell sx={{ maxWidth: { xs: 160, sm: 280 } }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{m.productName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">{m.articleNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          <StatusChip label={m.movementType === 'IN' ? t('stockIn') : t('stockOut')} tone={m.movementType === 'IN' ? 'primary' : 'neutral'} icon={m.movementType === 'IN' ? <ArrowUpIcon /> : <ArrowDownIcon />} />
                          {isReversal && <StatusChip label={t('reversalLabel')} tone="info" icon={<UndoIcon />} title={m.reasonCode ? `${t('reasonCode')}: ${m.reasonCode}` : undefined} />}
                          {reversed && <StatusChip label={t('reversedLabel')} tone="neutral" />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{formatSigned(m.movementType === 'IN' ? m.quantity : -m.quantity, lang)}</TableCell>
                      {showCost && (
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{movementCostState(m.totalCost) === 'value' ? formatCurrency(m.totalCost, lang) : (
                          <Tooltip title={t('movementNoCost')}><span aria-label={t('movementNoCost')}>—</span></Tooltip>
                        )}</TableCell>
                      )}
                      <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary' }}>{formatInt(m.stockAfter, lang)}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary' }}>{m.performedBy}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{formatDateTime(m.occurredAt, lang)}</TableCell>
                      {showActions && (
                        <TableCell sx={stickyActions}>
                          {!reversed && !isReversal && (
                            <ActionButton label={t('reverseMovement')} icon={<UndoIcon fontSize="small" />} color="warning" onClick={() => onReverse(m)} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {(movementsQ.data?.totalElements ?? 0) > MOVEMENT_PAGE_SIZE && (
            <TablePagination
              component="div"
              count={movementsQ.data?.totalElements ?? 0}
              page={page}
              onPageChange={(_, p) => onPage(p)}
              rowsPerPage={MOVEMENT_PAGE_SIZE}
              rowsPerPageOptions={[MOVEMENT_PAGE_SIZE]}
              labelRowsPerPage={t('rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => `${formatInt(from, lang)}–${formatInt(to, lang)} ${t('ofLabel')} ${formatInt(count, lang)}`}
            />
          )}
        </TableCard>
      )}
    </Stack>
  );
}
