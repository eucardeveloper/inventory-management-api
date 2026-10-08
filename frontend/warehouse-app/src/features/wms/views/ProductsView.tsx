'use client';

import React, { useState } from 'react';
import { Box, Button, Divider, Drawer, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Block as BlockIcon, CheckCircleOutline as ReactivateIcon, Close as CloseIcon, Edit as EditIcon, Inventory as InventoryIcon, Search as SearchIcon, SearchOff as SearchOffIcon } from '@mui/icons-material';
import { type Page, type Product, type StockMovement } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { formatDate } from '@/features/wms/dates';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions } from '@/features/wms/components/Primitives';

export type ProductFilter = 'all' | 'active' | 'inactive' | 'low';

interface ProductsViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  productsQ: UseQueryResult<Product[], Error>;
  filteredProducts: Product[];
  search: string;
  onSearch: (value: string) => void;
  productFilter: ProductFilter;
  onFilter: (value: ProductFilter) => void;
  allMovementsQ: UseQueryResult<Page<StockMovement>, Error>;
  detail: Product | null;
  onOpenDetail: (p: Product) => void;
  onCloseDetail: () => void;
  onAdd: () => void;
  onEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void;
}

const PAGE_SIZE = 25;

function isLow(p: Product): boolean {
  return p.reorderLevel != null && p.stock <= p.reorderLevel;
}

export function ProductsView({
  t, lang, perms, productsQ, filteredProducts, search, onSearch, productFilter, onFilter,
  allMovementsQ, detail, onOpenDetail, onCloseDetail, onAdd, onEdit, onToggleActive,
}: ProductsViewProps) {
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(filteredProducts.length / PAGE_SIZE) - 1);
  const safePage = Math.min(page, lastPage);
  const rows = filteredProducts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const filtering = search !== '' || productFilter !== 'all';
  const showActions = perms.canEditProducts;
  const colCount = 6 + (perms.canSeeFinancials ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('products')}
        subtitle={productsQ.data ? `${filteredProducts.length} ${t('productsShown')}` : undefined}
        actions={perms.canEditProducts ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{t('addProduct')}</Button>
        ) : <StatusChip label={t('viewOnly')} tone="neutral" />}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          placeholder={t('search')}
          value={search}
          onChange={(e) => { onSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 0, bgcolor: 'background.paper' }}
        />
        <FormControl size="small" sx={{ minWidth: { sm: 180 }, bgcolor: 'background.paper' }}>
          <InputLabel>{t('filter')}</InputLabel>
          <Select
            label={t('filter')}
            value={productFilter}
            onChange={(e) => { onFilter(e.target.value as ProductFilter); setPage(0); }}
          >
            <MenuItem value="all">{t('all')}</MenuItem>
            <MenuItem value="active">{t('active_products')}</MenuItem>
            <MenuItem value="inactive">{t('inactive_products')}</MenuItem>
            <MenuItem value="low">{t('lowStock')}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {productsQ.isError ? (
        <ErrorState title={t('loadError')} message={productsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => productsQ.refetch()} retryLabel={t('retry')} />
      ) : !productsQ.isLoading && filteredProducts.length === 0 ? (
        <SectionCard>
          {filtering ? (
            <EmptyState
              icon={<SearchOffIcon />}
              title={t('noResults')}
              message={t('noResultsMsg')}
              action={<Button variant="outlined" onClick={() => { onSearch(''); onFilter('all'); }}>{t('clearFilters')}</Button>}
            />
          ) : (
            <EmptyState
              icon={<InventoryIcon />}
              title={t('noProducts')}
              message={t('noProductsMsg')}
              action={perms.canEditProducts ? <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{t('addProduct')}</Button> : undefined}
            />
          )}
        </SectionCard>
      ) : (
        <TableCard>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('name')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('articleNumber')}</TableCell>
                <TableCell align="right">{t('stock')}</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('reorderLevel')}</TableCell>
                {perms.canSeeFinancials && <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('unitPrice')}</TableCell>}
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('supplier')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                {showActions && <TableCell sx={stickyActions}>{t('actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {productsQ.isLoading ? (
                <SkeletonRows cols={colCount} />
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id} hover sx={{ cursor: 'pointer', opacity: p.active ? 1 : 0.6 }} onClick={() => onOpenDetail(p)}>
                    <TableCell sx={{ maxWidth: { xs: 180, sm: 320 } }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ display: { xs: 'block', md: 'none' }, fontFamily: 'monospace' }}>{p.articleNumber}</Typography>
                        </Box>
                        {p.active && isLow(p) && <StatusChip label={t('lowStock')} tone="warning" />}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.articleNumber}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: p.active && isLow(p) ? 'warning.main' : 'text.primary' }}>{p.stock}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{p.reorderLevel ?? '—'}</TableCell>
                    {perms.canSeeFinancials && (
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatCurrency(p.unitPrice, lang)}</TableCell>
                    )}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary', maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>{p.supplier?.companyName ?? '—'}</Typography>
                    </TableCell>
                    <TableCell><StatusChip label={p.active ? t('active') : t('inactive')} tone={p.active ? 'success' : 'neutral'} /></TableCell>
                    {showActions && (
                      <TableCell sx={stickyActions} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={t('edit')}>
                          <IconButton size="small" aria-label={t('edit')} onClick={() => onEdit(p)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={p.active ? t('deactivate') : t('reactivate')}>
                          <IconButton size="small" color={p.active ? 'error' : 'success'} aria-label={p.active ? t('deactivate') : t('reactivate')} onClick={() => onToggleActive(p)}>
                            {p.active ? <BlockIcon fontSize="small" /> : <ReactivateIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredProducts.length > PAGE_SIZE && (
            <TablePagination
              component="div"
              count={filteredProducts.length}
              page={safePage}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              labelRowsPerPage={t('rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('ofLabel')} ${count}`}
            />
          )}
        </TableCard>
      )}

      {/* Product detail drawer */}
      <Drawer
        anchor="right"
        open={Boolean(detail)}
        onClose={onCloseDetail}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 }, maxWidth: '100%' } }}
      >
        {detail && (
          <Stack sx={{ height: '100%', minWidth: 0 }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap>{detail.name}</Typography>
                <IconButton onClick={onCloseDetail} aria-label={t('close')}><CloseIcon /></IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{detail.articleNumber}</Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
              <Stack spacing={2}>
                <DetailRow label={t('status')}><StatusChip label={detail.active ? t('active') : t('inactive')} tone={detail.active ? 'success' : 'neutral'} /></DetailRow>
                <DetailRow label={t('stock')}><Typography variant="body2" fontWeight={700}>{detail.stock}</Typography></DetailRow>
                {perms.canSeeFinancials && (
                  <DetailRow label={t('unitPrice')}><Typography variant="body2" fontWeight={600}>{formatCurrency(detail.unitPrice, lang)}</Typography></DetailRow>
                )}
                <DetailRow label={t('reorderLevel')}><Typography variant="body2" fontWeight={600}>{detail.reorderLevel ?? '—'}</Typography></DetailRow>
                <DetailRow label={t('supplier')}><Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{detail.supplier?.companyName ?? '—'}</Typography></DetailRow>
                {detail.description && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t('description')}</Typography>
                    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{detail.description}</Typography>
                  </Box>
                )}

                <Divider />
                <Typography variant="subtitle2">{t('lastMovements')}</Typography>
                {allMovementsQ.isError ? (
                  <Typography variant="body2" color="error">{allMovementsQ.error?.message ?? t('loadErrorMsg')}</Typography>
                ) : (() => {
                  const mine = (allMovementsQ.data?.content ?? []).filter((m) => m.productId === detail.id).slice(0, 5);
                  if (mine.length === 0) return <Typography variant="body2" color="text.secondary">{t('noMovements')}</Typography>;
                  return mine.map((m) => (
                    <Stack key={m.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusChip label={m.movementType === 'IN' ? t('stockIn') : t('stockOut')} tone={m.movementType === 'IN' ? 'success' : 'error'} />
                        <Typography variant="body2" fontWeight={600}>{m.quantity}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{formatDate(m.occurredAt, lang)}</Typography>
                    </Stack>
                  ));
                })()}
              </Stack>
            </Box>

            {perms.canEditProducts && (
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" startIcon={<EditIcon />} fullWidth onClick={() => { onEdit(detail); onCloseDetail(); }}>{t('edit')}</Button>
                  <Button
                    variant="outlined"
                    color={detail.active ? 'error' : 'success'}
                    startIcon={detail.active ? <BlockIcon /> : <ReactivateIcon />}
                    fullWidth
                    onClick={() => { onToggleActive(detail); onCloseDetail(); }}
                  >
                    {detail.active ? t('deactivate') : t('reactivate')}
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {children}
    </Stack>
  );
}
