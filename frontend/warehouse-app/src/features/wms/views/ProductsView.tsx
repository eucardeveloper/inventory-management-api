'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, Drawer, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Block as BlockIcon, CheckCircleOutline as ReactivateIcon, Clear as ClearIcon, Close as CloseIcon, Edit as EditIcon, InfoOutlined as InfoIcon, Inventory as InventoryIcon, Search as SearchIcon, SearchOff as SearchOffIcon } from '@mui/icons-material';
import { type Page, type Product, type StockMovement, type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCount, formatCurrency, formatInt, formatSigned } from '@/features/wms/format';
import { formatDate } from '@/features/wms/dates';
import { type ProductFilter, type SortDir, type SortKey, paginate, sortProducts, stockStatus } from '@/features/wms/productFilters';
import { fifoCostState, listPriceValue } from '@/features/wms/valuation';
import { ColumnVisibilityMenu } from '@/features/wms/components/Shared';
import { ActionButton, EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, StockStatusChip, TableCard, TableToolbar, stickyActions } from '@/features/wms/components/Primitives';

export type { ProductFilter } from '@/features/wms/productFilters';

interface ProductsViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  productsQ: UseQueryResult<Product[], Error>;
  reportQ: UseQueryResult<StockReport[], Error>;
  /** Products after search and filter (see productFilters.ts). */
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

// Columns the user can hide. Name, stock, status and actions always stay.
type OptionalColumn = 'article' | 'reorder' | 'price' | 'supplier';
const OPTIONAL_COLUMNS: OptionalColumn[] = ['article', 'reorder', 'price', 'supplier'];
const COLUMNS_KEY = 'inv.products.columns';

export function ProductsView({
  t, lang, perms, productsQ, reportQ, filteredProducts, search, onSearch, productFilter, onFilter,
  allMovementsQ, detail, onOpenDetail, onCloseDetail, onAdd, onEdit, onToggleActive,
}: ProductsViewProps) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'name', dir: 'asc' });
  const [shown, setShown] = useState<ReadonlySet<OptionalColumn>>(() => new Set(OPTIONAL_COLUMNS));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLUMNS_KEY) ?? 'null');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after hydration; reading it during render would cause a server/client mismatch
      if (Array.isArray(saved)) setShown(new Set(OPTIONAL_COLUMNS.filter((c) => saved.includes(c))));
    } catch { /* ignore */ }
  }, []);
  const changeColumns = (next: Set<OptionalColumn>) => {
    setShown(next);
    try { localStorage.setItem(COLUMNS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  };
  const showArticle = shown.has('article');
  const showReorder = shown.has('reorder');
  const showPrice = shown.has('price') && perms.canSeeFinancials;
  const showSupplier = shown.has('supplier');

  const sorted = useMemo(() => sortProducts(filteredProducts, sort.key, sort.dir), [filteredProducts, sort]);
  const view = paginate(sorted, page, PAGE_SIZE);
  const filtering = search.trim() !== '' || productFilter !== 'all';
  const total = productsQ.data?.length ?? 0;
  const showActions = perms.canEditProducts;
  const colCount = 3 + [showArticle, showReorder, showPrice, showSupplier].filter(Boolean).length + (showActions ? 1 : 0);
  const statusLabels = { out: t('outOfStock'), low: t('lowStock'), ok: t('statusOk') };

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'articleNumber' || key === 'status' ? 'asc' : 'desc' }));
    setPage(0);
  };
  const sortCell = (key: SortKey, label: string, opts?: { align?: 'right'; sx?: object }) => (
    <TableCell
      align={opts?.align}
      sortDirection={sort.key === key ? sort.dir : false}
      aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      sx={opts?.sx}
    >
      <TableSortLabel active={sort.key === key} direction={sort.key === key ? sort.dir : 'asc'} onClick={() => toggleSort(key)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const count = productsQ.data
    ? filtering
      ? `${formatInt(filteredProducts.length, lang)} ${t('ofLabel')} ${formatCount(total, t('unitProducts'), lang)}`
      : formatCount(total, t('unitProducts'), lang)
    : undefined;

  const toolbar = (
    <TableToolbar count={count}>
      <TextField
        placeholder={t('searchProductsPlaceholder')}
        value={search}
        onChange={(e) => { onSearch(e.target.value); setPage(0); }}
        inputProps={{ 'aria-label': t('search') }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label={t('clearFilters')} onClick={() => { onSearch(''); setPage(0); }}><ClearIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        sx={{ width: 320, maxWidth: '100%' }}
      />
      <FormControl sx={{ width: 200 }}>
        <InputLabel id="product-filter-label">{t('filter')}</InputLabel>
        <Select labelId="product-filter-label" label={t('filter')} value={productFilter} onChange={(e) => { onFilter(e.target.value as ProductFilter); setPage(0); }}>
          <MenuItem value="active">{t('active_products')}</MenuItem>
          <MenuItem value="all">{t('all')}</MenuItem>
          <MenuItem value="low">{t('kpiLowStock')}</MenuItem>
          <MenuItem value="out">{t('outOfStock')}</MenuItem>
          <MenuItem value="inactive">{t('inactive_products')}</MenuItem>
        </Select>
      </FormControl>
      <ColumnVisibilityMenu
        label={t('showColumns')}
        visible={shown}
        onChange={changeColumns}
        columns={[
          { key: 'article', label: t('articleNumber') },
          { key: 'reorder', label: t('reorderLevel') },
          ...(perms.canSeeFinancials ? [{ key: 'price' as const, label: t('unitPrice') }] : []),
          { key: 'supplier', label: t('supplier') },
        ]}
      />
    </TableToolbar>
  );

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('products')}
        subtitle={t('subProducts')}
        actions={perms.canEditProducts ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{t('addProduct')}</Button>
        ) : <StatusChip label={t('viewOnly')} tone="neutral" />}
      />

      {productsQ.isError ? (
        <ErrorState title={t('loadError')} message={productsQ.error?.message ?? t('loadErrorMsg')} onRetry={() => productsQ.refetch()} retryLabel={t('retry')} />
      ) : !productsQ.isLoading && total === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<InventoryIcon />}
            title={t('noProducts')}
            message={t('noProductsMsg')}
            action={perms.canEditProducts ? <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{t('addProduct')}</Button> : undefined}
          />
        </SectionCard>
      ) : !productsQ.isLoading && filteredProducts.length === 0 ? (
        <SectionCard>
          {toolbar}
          <EmptyState
            icon={<SearchOffIcon />}
            title={t('noResults')}
            message={t('noResultsMsg')}
            action={<Button variant="outlined" onClick={() => { onSearch(''); onFilter('all'); }}>{t('clearFilters')}</Button>}
          />
        </SectionCard>
      ) : (
        <TableCard toolbar={toolbar}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {sortCell('name', t('name'))}
                {showArticle && sortCell('articleNumber', t('articleNumber'), { sx: { display: { xs: 'none', md: 'table-cell' } } })}
                {sortCell('stock', t('stock'), { align: 'right' })}
                {showReorder && sortCell('reorderLevel', t('reorderLevel'), { align: 'right', sx: { display: { xs: 'none', lg: 'table-cell' } } })}
                {showPrice && sortCell('unitPrice', t('unitPrice'), { align: 'right', sx: { display: { xs: 'none', sm: 'table-cell' } } })}
                {showSupplier && <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('supplier')}</TableCell>}
                {sortCell('status', t('status'))}
                {showActions && <TableCell sx={stickyActions}>{t('actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {productsQ.isLoading ? (
                <SkeletonRows cols={colCount} />
              ) : (
                view.rows.map((p) => {
                  const status = stockStatus(p);
                  return (
                    <TableRow key={p.id} hover sx={{ cursor: 'pointer', opacity: p.active ? 1 : 0.7 }} onClick={() => onOpenDetail(p)}>
                      <TableCell sx={{ maxWidth: { xs: 180, sm: 340 } }}>
                        <Typography variant="body2" fontWeight={500} noWrap title={p.name}>{p.name}</Typography>
                        {showArticle && <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ display: { xs: 'block', md: 'none' } }}>{p.articleNumber}</Typography>}
                      </TableCell>
                      {showArticle && <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary', whiteSpace: 'nowrap' }}>{p.articleNumber}</TableCell>}
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{formatInt(p.stock, lang)}</TableCell>
                      {showReorder && <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary' }}>{formatInt(p.reorderLevel, lang)}</TableCell>}
                      {showPrice && (
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}>{formatCurrency(p.unitPrice, lang)}</TableCell>
                      )}
                      {showSupplier && (
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary', maxWidth: 260 }}>
                          <Typography variant="body2" noWrap title={p.supplier?.companyName}>{p.supplier?.companyName ?? '—'}</Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        {p.active ? <StockStatusChip status={status} labels={statusLabels} /> : <StatusChip label={t('inactive')} tone="neutral" icon={<BlockIcon />} />}
                      </TableCell>
                      {showActions && (
                        <TableCell sx={stickyActions} onClick={(e) => e.stopPropagation()}>
                          <ActionButton label={t('edit')} icon={<EditIcon fontSize="small" />} onClick={() => onEdit(p)} />
                          <ActionButton
                            label={p.active ? t('deactivate') : t('reactivate')}
                            icon={p.active ? <BlockIcon fontSize="small" /> : <ReactivateIcon fontSize="small" />}
                            color={p.active ? 'warning' : 'success'}
                            onClick={() => onToggleActive(p)}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {view.total > PAGE_SIZE && (
            <TablePagination
              component="div"
              count={view.total}
              page={view.page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              labelRowsPerPage={t('rowsPerPage')}
              labelDisplayedRows={({ from, to, count: c }) => `${formatInt(from, lang)}–${formatInt(to, lang)} ${t('ofLabel')} ${formatInt(c, lang)}`}
            />
          )}
        </TableCard>
      )}

      {/* Product detail: code, available stock, reorder threshold and the two stock values kept apart */}
      <Drawer
        anchor="right"
        open={Boolean(detail)}
        onClose={onCloseDetail}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 420 }, maxWidth: '100%' } }}
      >
        {detail && (
          <ProductDetail
            t={t} lang={lang} perms={perms} p={detail} reportQ={reportQ} allMovementsQ={allMovementsQ}
            onClose={onCloseDetail} onEdit={onEdit} onToggleActive={onToggleActive}
          />
        )}
      </Drawer>
    </Stack>
  );
}

function ProductDetail({ t, lang, perms, p, reportQ, allMovementsQ, onClose, onEdit, onToggleActive }: {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  p: Product;
  reportQ: UseQueryResult<StockReport[], Error>;
  allMovementsQ: UseQueryResult<Page<StockMovement>, Error>;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void;
}) {
  const status = stockStatus(p);
  const statusLabels = { out: t('outOfStock'), low: t('lowStock'), ok: t('statusOk') };
  const row = (reportQ.data ?? []).find((r) => r.productId === p.id);
  const cost = fifoCostState(p.stock, row?.inventoryValue ?? 0);
  const listValue = listPriceValue(p.stock, p.unitPrice);
  const mine = (allMovementsQ.data?.content ?? []).filter((m) => m.productId === p.id).slice(0, 5);

  return (
    <Stack sx={{ height: '100%', minWidth: 0 }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap title={p.name}>{p.name}</Typography>
          <IconButton onClick={onClose} aria-label={t('close')}><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="div">{t('articleNumber')}: {p.articleNumber}</Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        <Stack spacing={2}>
          <DetailRow label={t('status')}>
            {p.active ? <StockStatusChip status={status} labels={statusLabels} /> : <StatusChip label={t('inactive')} tone="neutral" icon={<BlockIcon />} />}
          </DetailRow>
          <DetailRow label={t('stock')}><Typography variant="body2" fontWeight={600}>{formatInt(p.stock, lang)}</Typography></DetailRow>
          <DetailRow label={t('reorderLevel')}><Typography variant="body2" fontWeight={600}>{formatInt(p.reorderLevel, lang)}</Typography></DetailRow>
          <DetailRow label={t('supplier')}><Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{p.supplier?.companyName ?? '—'}</Typography></DetailRow>

          <Divider />
          {perms.canSeeFinancials ? (
            <>
              <DetailRow label={t('unitPrice')}><Typography variant="body2" fontWeight={600}>{formatCurrency(p.unitPrice, lang)}</Typography></DetailRow>
              <DetailRow label={t('listValue')} hint={t('hintListValue')}>
                <Typography variant="body2" fontWeight={600}>{formatCurrency(listValue, lang)}</Typography>
              </DetailRow>
              <DetailRow label={t('fifoValueShort')} hint={t('hintFifoValue')}>
                {reportQ.isLoading ? (
                  <Typography variant="body2" color="text.secondary">{t('loading')}</Typography>
                ) : reportQ.isError ? (
                  <Typography variant="body2" color="error">{t('loadError')}</Typography>
                ) : cost === 'none' ? (
                  <Tooltip title={t('noCostRecordHint')}><span><StatusChip label={t('noCostRecord')} tone="warning" icon={<InfoIcon />} /></span></Tooltip>
                ) : (
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(row?.inventoryValue ?? 0, lang)}</Typography>
                )}
              </DetailRow>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">{t('priceHidden')}</Typography>
          )}

          {p.description && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t('description')}</Typography>
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{p.description}</Typography>
            </Box>
          )}

          <Divider />
          <Typography variant="subtitle2">{t('lastMovements')}</Typography>
          {allMovementsQ.isError ? (
            <Typography variant="body2" color="error">{allMovementsQ.error?.message ?? t('loadErrorMsg')}</Typography>
          ) : mine.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{t('noMovements')}</Typography>
          ) : (
            mine.map((m) => (
              <Stack key={m.id} direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusChip label={m.movementType === 'IN' ? t('stockIn') : t('stockOut')} tone={m.movementType === 'IN' ? 'primary' : 'neutral'} />
                  <Typography variant="body2" fontWeight={600}>{formatSigned(m.movementType === 'IN' ? m.quantity : -m.quantity, lang)}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">{formatDate(m.occurredAt, lang)}</Typography>
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      {perms.canEditProducts && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<EditIcon />} fullWidth onClick={() => { onEdit(p); onClose(); }}>{t('edit')}</Button>
            <Button
              variant="outlined"
              color={p.active ? 'warning' : 'success'}
              startIcon={p.active ? <BlockIcon /> : <ReactivateIcon />}
              fullWidth
              onClick={() => { onToggleActive(p); onClose(); }}
            >
              {p.active ? t('deactivate') : t('reactivate')}
            </Button>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

function DetailRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        {hint && (
          <Tooltip title={hint} enterTouchDelay={0}>
            <IconButton size="small" aria-label={hint} sx={{ p: 0.25 }}><InfoIcon sx={{ fontSize: 16 }} /></IconButton>
          </Tooltip>
        )}
      </Stack>
      {children}
    </Stack>
  );
}
