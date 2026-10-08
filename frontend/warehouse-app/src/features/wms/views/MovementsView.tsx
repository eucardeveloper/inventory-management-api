'use client';

import React from 'react';
import { Autocomplete, Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, SwapVert as SwapVertIcon, Undo as UndoIcon } from '@mui/icons-material';
import { type Product, type StockMovement, type Page } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { formatDateTime } from '@/features/wms/dates';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions } from '@/features/wms/components/Primitives';

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

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('movements')}
        subtitle={movementsQ.data ? `${movementsQ.data.totalElements}` : undefined}
        actions={perms.canBookMovements ? <Button variant="contained" startIcon={<AddIcon />} onClick={onBook}>{t('recordMovement')}</Button> : undefined}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Autocomplete
          size="small"
          options={products}
          value={selected}
          onChange={(_, v) => onProductFilter(v ? v.id : '')}
          getOptionLabel={(p) => `${p.name} (${p.articleNumber})`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => <TextField {...params} label={t('product')} />}
          sx={{ flex: 1, minWidth: 0, bgcolor: 'background.paper' }}
        />
        {productFilter !== '' && (
          <Button variant="outlined" onClick={() => onProductFilter('')}>{t('clearFilters')}</Button>
        )}
      </Stack>

      {movementsQ.isError ? (
        <ErrorState title={t('loadError')} message={movementsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => movementsQ.refetch()} retryLabel={t('retry')} />
      ) : !movementsQ.isLoading && rows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<SwapVertIcon />}
            title={t('noMovements')}
            message={t('noMovementsMsg')}
            action={perms.canBookMovements ? <Button variant="contained" startIcon={<AddIcon />} onClick={onBook}>{t('recordMovement')}</Button> : undefined}
          />
        </SectionCard>
      ) : (
        <TableCard>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('product')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell align="right">{t('quantity')}</TableCell>
                {showCost && <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('cost')}</TableCell>}
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('stockAfter')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('user')}</TableCell>
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
                        <Typography variant="body2" fontWeight={600} noWrap>{m.productName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ fontFamily: 'monospace' }}>{m.articleNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          <StatusChip label={m.movementType} tone={m.movementType === 'IN' ? 'success' : 'error'} />
                          {isReversal && <StatusChip label={t('reversalLabel')} tone="info" title={m.reasonCode} />}
                          {reversed && <StatusChip label={t('reversedLabel')} tone="neutral" />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{m.quantity}</TableCell>
                      {showCost && (
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{m.totalCost != null ? formatCurrency(m.totalCost, lang) : '—'}</TableCell>
                      )}
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{m.stockAfter}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{m.performedBy}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{formatDateTime(m.occurredAt, lang)}</TableCell>
                      {showActions && (
                        <TableCell sx={stickyActions}>
                          {!reversed && !isReversal && (
                            <Tooltip title={t('reverseMovement')}>
                              <IconButton size="small" color="warning" aria-label={t('reverseMovement')} onClick={() => onReverse(m)}>
                                <UndoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('ofLabel')} ${count}`}
            />
          )}
        </TableCard>
      )}
    </Stack>
  );
}
