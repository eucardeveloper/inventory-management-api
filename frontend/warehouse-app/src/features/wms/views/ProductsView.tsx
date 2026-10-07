'use client';

import React from 'react';
import { Box, Button, Chip, Divider, Drawer, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Edit as EditIcon, Inventory as InventoryIcon, Search as SearchIcon } from '@mui/icons-material';
import { type Product, type StockMovement, type Page } from '@/hooks/useWmsQueries';
import { type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';

interface ProductsViewProps {
  t: (key: TKey) => string;
  perms: Permissions;
  setProductDialog: React.Dispatch<React.SetStateAction<Partial<Product> | null>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  productFilter: "active" | "inactive" | "all" | "low";
  setProductFilter: React.Dispatch<React.SetStateAction<"active" | "inactive" | "all" | "low">>;
  productsQ: UseQueryResult<Product[], Error>;
  filteredProducts: Product[];
  setProductDetailDrawer: React.Dispatch<React.SetStateAction<Product | null>>;
  lang: "en" | "tr" | "de";
  updateProduct: UseMutationResult<Product, Error, Partial<Product> & { id: number; }, unknown>;
  setDeleteProductDialog: React.Dispatch<React.SetStateAction<Product | null>>;
  productDetailDrawer: Product | null;
  allMovementsQ: UseQueryResult<Page<StockMovement>, Error>;
}

export function ProductsView({ t, perms, setProductDialog, search, setSearch, productFilter, setProductFilter, productsQ, filteredProducts, setProductDetailDrawer, lang, updateProduct, setDeleteProductDialog, productDetailDrawer, allMovementsQ }: ProductsViewProps) {
  return (
(
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('products')}
                  </Typography>
                  {perms.canWrite && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProductDialog({})}>
                      {t('addProduct')}
                    </Button>
                  )}
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder={t('search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>{t('filter')}</InputLabel>
                    <Select
                      label={t('filter')}
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value as typeof productFilter)}
                    >
                      <MenuItem value="all">{t('all')}</MenuItem>
                      <MenuItem value="active">{t('active_products')}</MenuItem>
                      <MenuItem value="inactive">{t('inactive_products')}</MenuItem>
                      <MenuItem value="low">{t('lowStock')}</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '60px' }} />
                      <col />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '160px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>ID</TableCell>
                        <TableCell>{t('name')}</TableCell>
                        <TableCell>{t('articleNumber')}</TableCell>
                        <TableCell align="center">{t('stock')}</TableCell>
                        {perms.canSeeFinancials && <TableCell align="center">{t('unitPrice')}</TableCell>}
                        <TableCell>{t('supplier')}</TableCell>
                        <TableCell>{t('active')}</TableCell>
                        {perms.canSeeProductEdit && <TableCell align="center">{t('actions')}</TableCell>}
</TableRow>
                    </TableHead>
                    <TableBody>
                      {productsQ.isLoading ? (
                        <SkeletonRows cols={perms.canSeeProductEdit ? 7 : 6} />
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canSeeProductEdit ? 7 : 6} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<InventoryIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noProducts')}
                              message={t('noProductsMsg')}
                              action={
                                perms.canWrite ? (
                                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProductDialog({})}>
                                    {t('addProduct')}
                                  </Button>
                                ) : undefined
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((p) => (
                          <TableRow
                            key={p.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setProductDetailDrawer(p)}
                          >
                            <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem', fontFamily: 'monospace' }}>{p.id}</TableCell>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                                {p.reorderLevel != null && p.stock <= p.reorderLevel && (
                                  <Chip size="small" label={t('lowStock')} color="warning" />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.articleNumber}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, color: p.reorderLevel != null && p.stock <= p.reorderLevel ? 'warning.main' : 'text.primary' }}>
                              {p.stock}
                            </TableCell>
                            {perms.canSeeFinancials && (
                              <TableCell align="center">{formatCurrency(p.unitPrice, lang)}</TableCell>
                            )}
                            <TableCell>{p.supplier?.companyName ?? '—'}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={p.active ? t('active') : t('inactive')}
                                color={p.active ? 'success' : 'default'}
                                variant={p.active ? 'filled' : 'outlined'}
                                onClick={perms.canSeeProductEdit ? () => updateProduct.mutate({ id: p.id, active: !p.active }) : undefined}
                                sx={perms.canSeeProductEdit ? { cursor: 'pointer', fontWeight: 700 } : { fontWeight: 700 }}
                              />
                            </TableCell>
                            {perms.canSeeProductEdit && (
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                <IconButton size="small" onClick={() => setProductDialog({ ...p })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteProductDialog(p)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Product detail drawer */}
                <Drawer
                  anchor="right"
                  open={Boolean(productDetailDrawer)}
                  onClose={() => setProductDetailDrawer(null)}
                  sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 380 }, p: 0 } }}
                >
                  {productDetailDrawer && (
                    <Stack sx={{ height: '100%' }}>
                      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                            {productDetailDrawer.name}
                          </Typography>
                          <IconButton onClick={() => setProductDetailDrawer(null)}><CloseIcon /></IconButton>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {productDetailDrawer.articleNumber}
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">{t('status')}</Typography>
                            <Chip
                              size="small"
                              label={productDetailDrawer.active ? t('active') : t('inactive')}
                              color={productDetailDrawer.active ? 'success' : 'default'}
                              variant={productDetailDrawer.active ? 'filled' : 'outlined'}
                              onClick={perms.canSeeProductEdit ? () => {
                                updateProduct.mutate({ id: productDetailDrawer.id, active: !productDetailDrawer.active });
                                setProductDetailDrawer((p) => p ? { ...p, active: !p.active } : p);
                              } : undefined}
                              sx={perms.canSeeProductEdit ? { cursor: 'pointer', fontWeight: 700 } : { fontWeight: 700 }}
                            />
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{t('stock')}</Typography>
                            <Typography variant="body2" fontWeight={600}>{productDetailDrawer.stock}</Typography>
                          </Stack>
                          {perms.canSeeFinancials && (
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">{t('unitPrice')}</Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(productDetailDrawer.unitPrice, lang)}
                              </Typography>
                            </Stack>
                          )}
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{t('reorderLevel')}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productDetailDrawer.reorderLevel ?? '—'}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{t('supplier')}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productDetailDrawer.supplier?.companyName ?? '—'}
                            </Typography>
                          </Stack>
                          {productDetailDrawer.description && (
                            <Box>
                              <Typography variant="body2" color="text.secondary" mb={0.5}>{t('description')}</Typography>
                              <Typography variant="body2">{productDetailDrawer.description}</Typography>
                            </Box>
                          )}

                          <Divider />
                          <Typography variant="subtitle2" fontWeight={700}>{t('lastMovements')}</Typography>
                          {/* Mini movements list */}
                          {(allMovementsQ.data?.content ?? [])
                            .filter((m) => m.productId === productDetailDrawer.id)
                            .slice(0, 5)
                            .map((m) => (
                              <Stack key={m.id} direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip size="small" label={m.movementType} color={m.movementType === 'IN' ? 'success' : 'error'} variant="outlined" />
                                  <Typography variant="body2">{m.quantity}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(m.occurredAt).toLocaleDateString()}
                                </Typography>
                              </Stack>
                            ))}
                        </Stack>
                      </Box>

                      {perms.canSeeProductEdit && (
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              startIcon={<EditIcon />}
                              fullWidth
                              onClick={() => { setProductDialog({ ...productDetailDrawer }); setProductDetailDrawer(null); }}
                            >
                              {t('edit')}
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              fullWidth
                              onClick={() => { setDeleteProductDialog(productDetailDrawer); setProductDetailDrawer(null); }}
                            >
                              {t('delete')}
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  )}
                </Drawer>
              </Stack>
            )
  );
}
