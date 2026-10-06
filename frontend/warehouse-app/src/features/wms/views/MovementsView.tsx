'use client';

import React from 'react';
import { Button, Chip, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Assessment as AssessmentIcon, SwapVert as SwapVertIcon, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon, Undo as UndoIcon } from '@mui/icons-material';
import { type Product, type StockMovement, type Page } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { KpiCard, EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';
import { PieChart } from '@/features/wms/components/PieChart';

interface MovementsViewProps {
  t: (key: TKey) => string;
  setMovementDialog: React.Dispatch<React.SetStateAction<boolean>>;
  kpiData: { totalProducts: number; activeProducts: number; lowStock: number; totalIn: number; totalOut: number; totalValue: number; todayMovements: number; criticalStock: number; };
  perms: Permissions;
  lang: "en" | "tr" | "de";
  movementProductFilter: number | "";
  setMovementProductFilter: React.Dispatch<React.SetStateAction<number | "">>;
  setMovementPage: React.Dispatch<React.SetStateAction<number>>;
  productsQ: UseQueryResult<Product[], Error>;
  reportWithFifo: { fifoValue: number; productId: number; productName: string; articleNumber: string; totalIn: number; totalOut: number; currentStock: number; reorderLevel?: number; isLowStock: boolean; }[];
  movementsQ: UseQueryResult<Page<StockMovement>, Error>;
  setReverseDialog: React.Dispatch<React.SetStateAction<StockMovement | null>>;
  setReverseReasonCode: React.Dispatch<React.SetStateAction<string>>;
  setReverseReasonError: React.Dispatch<React.SetStateAction<string>>;
  movementPage: number;
}

export function MovementsView({ t, setMovementDialog, kpiData, perms, lang, movementProductFilter, setMovementProductFilter, setMovementPage, productsQ, reportWithFifo, movementsQ, setReverseDialog, setReverseReasonCode, setReverseReasonError, movementPage }: MovementsViewProps) {
  return (
(
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('movements')}
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setMovementDialog(true)}>
                    {t('recordMovement')}
                  </Button>
                </Stack>

                {/* KPI row */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <KpiCard label={t('kpiIn')} value={kpiData.totalIn} icon={<TrendingUpIcon />} color="success.main" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <KpiCard label={t('kpiOut')} value={kpiData.totalOut} icon={<TrendingDownIcon />} color="error.main" />
                  </Grid>
                  {perms.canSeeMovementCost && (
                    <Grid item xs={12} sm={4}>
                      <KpiCard label={t('kpiTotalStockValue')} value={formatCurrency(kpiData.totalValue, lang)} icon={<AssessmentIcon />} color="primary.main" />
                    </Grid>
                  )}
                </Grid>

                {/* Filter by product */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>{t('product')}</InputLabel>
                    <Select
                      label={t('product')}
                      value={movementProductFilter}
                      onChange={(e) => { setMovementProductFilter(e.target.value as number | ''); setMovementPage(0); }}
                    >
                      <MenuItem value="">{t('all')}</MenuItem>
                      {(productsQ.data ?? []).map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {movementProductFilter !== '' && (
                    <Button variant="outlined" size="small" onClick={() => { setMovementProductFilter(''); setMovementPage(0); }}>
                      {t('clearFilters')}
                    </Button>
                  )}
                </Stack>

                {/* ── Stock Report Pie Charts ── */}
                {reportWithFifo.length > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                        <PieChart
                          title={t('inOutBalance')}
                          donut
                          size={200}
                          slices={[
                            { label: t('totalIn'),  value: reportWithFifo.reduce((s,r) => s + r.totalIn,  0), color: '#10b981' },
                            { label: t('totalOut'), value: reportWithFifo.reduce((s,r) => s + r.totalOut, 0), color: '#ef4444' },
                          ].filter(s => s.value > 0)}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                        <PieChart
                          title={t('stockStatus')}
                          size={200}
                          slices={[
                            { label: t('normalStock'), value: reportWithFifo.filter(r => !r.isLowStock).length, color: '#6366f1' },
                            { label: t('lowStock'),  value: reportWithFifo.filter(r => r.isLowStock).length,  color: '#f59e0b' },
                          ].filter(s => s.value > 0)}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('product')}</TableCell>
                        <TableCell>{t('type')}</TableCell>
                        <TableCell align="center">{t('quantity')}</TableCell>
                        {perms.canSeeMovementCost && <TableCell align="center">{t('cost')}</TableCell>}
                        <TableCell align="center">{t('stockAfter')}</TableCell>
                        <TableCell>{t('user')}</TableCell>
                        <TableCell>{t('date')}</TableCell>
                        {perms.canReverseMovements && <TableCell sx={{ textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('actions')}</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movementsQ.isLoading ? (
                        <SkeletonRows cols={perms.canReverseMovements ? 8 : 7} />
                      ) : (movementsQ.data?.content ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canReverseMovements ? 8 : 7} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<SwapVertIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noMovements')}
                              message={t('noMovementsMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (movementsQ.data?.content ?? []).map((m) => (
                          <TableRow key={m.id} hover sx={{ opacity: m.reversedById ? 0.5 : 1 }}>
                            <TableCell>{m.productName}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={m.movementType}
                                color={m.movementType === 'IN' ? 'success' : 'error'}
                                variant="outlined"
                              />
                              {m.reversalOfId && (
                                <Chip size="small" label="REV" sx={{ ml: 0.5 }} variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell align="center">{m.quantity}</TableCell>
                            {perms.canSeeMovementCost && (
                              <TableCell align="center">{formatCurrency(m.totalCost, lang)}</TableCell>
                            )}
                            <TableCell align="center">{m.stockAfter}</TableCell>
                            <TableCell>{m.performedBy}</TableCell>
                            <TableCell>{new Date(m.occurredAt).toLocaleString()}</TableCell>
                            {perms.canReverseMovements && (
                              <TableCell align="center">
                                {!m.reversedById && !m.reversalOfId && (
                                  <Tooltip title={t('reverseMovement')}>
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => { setReverseDialog(m); setReverseReasonCode(''); setReverseReasonError(''); }}
                                    >
                                      <UndoIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={movementsQ.data?.totalElements ?? 0}
                    page={movementPage}
                    onPageChange={(_, p) => setMovementPage(p)}
                    rowsPerPage={50}
                    rowsPerPageOptions={[50]}
                    labelRowsPerPage={t('rowsPerPage')}
                  />
                </TableContainer>
              </Stack>
            )
  );
}
