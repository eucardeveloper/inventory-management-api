'use client';

import React from 'react';
import { Box, Button, Chip, Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, CheckCircle as CheckCircleIcon, Inventory as InventoryIcon, SwapVert as SwapVertIcon, Warning as WarningIcon, ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { type Product, type StockMovement, type Page } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { Permissions, WmsRole } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { KpiCard, EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';
import { PieChart } from '@/features/wms/components/PieChart';
import { MovementTrendChart } from '@/features/wms/components/MovementTrendChart';

interface DashboardViewProps {
  t: (key: TKey) => string;
  lang: "en" | "tr" | "de";
  kpiData: { totalProducts: number; activeProducts: number; lowStock: number; totalIn: number; totalOut: number; totalValue: number; todayMovements: number; criticalStock: number; };
  perms: Permissions;
  productsQ: UseQueryResult<Product[], Error>;
  setPage: (id: "dashboard" | "products" | "suppliers" | "movements" | "report" | "audit" | "users") => void;
  auth: { username: string; role: WmsRole; };
  setMovementForm: React.Dispatch<React.SetStateAction<{ productId: number | ""; movementType: "IN" | "OUT"; quantity: number | ""; unitCost: number | ""; }>>;
  setMovementDialog: React.Dispatch<React.SetStateAction<boolean>>;
  allMovementsQ: UseQueryResult<Page<StockMovement>, Error>;
}

export function DashboardView({ t, lang, kpiData, perms, productsQ, setPage, auth, setMovementForm, setMovementDialog, allMovementsQ }: DashboardViewProps) {
  return (
(
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {t('dashboard')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                </Stack>

                {/* KPI cards */}
                <Grid container spacing={2}>
                  {[
                    { label: t('kpiTotalProducts'), value: kpiData.totalProducts, icon: <InventoryIcon />, color: 'primary.main' },
                    { label: t('kpiActiveProducts'), value: kpiData.activeProducts, icon: <CheckCircleIcon />, color: 'success.main' },
                    { label: t('kpiLowStock'), value: kpiData.lowStock, icon: <WarningIcon />, color: kpiData.lowStock > 0 ? 'warning.main' : 'success.main' },
                    { label: t('todayMovements'), value: kpiData.todayMovements, icon: <SwapHorizIcon />, color: kpiData.todayMovements > 0 ? 'primary.main' : 'text.secondary', subtitle: new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' }) },
                    ...(perms.canSeeFinancials
                      ? [{ label: t('kpiTotalStockValue'), value: formatCurrency(kpiData.totalValue, lang), icon: <AssessmentIcon />, color: 'info.main' }]
                      : []),
                  ].map((kpi, i) => (
                    <Grid item xs={12} sm={6} lg={3} key={i}>
                      <KpiCard label={kpi.label} value={kpi.value} icon={kpi.icon} color={kpi.color} subtitle={(kpi as {subtitle?: string}).subtitle} />
                    </Grid>
                  ))}
                </Grid>

                {/* Attention Required panel */}
                {(() => {
                  const attnProducts = (productsQ.data ?? []).filter((p) => p.active && p.reorderLevel != null && p.stock <= p.reorderLevel!);
                  if (attnProducts.length === 0) return null;
                  return (
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'warning.main', borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)' }}>
                      <Stack direction="row" alignItems="center" gap={1} mb={2}>
                        <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight={700} color="warning.main">
                          {t('attentionRequired')} ({attnProducts.length})
                        </Typography>
                      </Stack>
                      <Grid container spacing={1.5}>
                        {attnProducts.slice(0, 6).map((p) => (
                          <Grid item xs={12} sm={6} md={4} key={p.id}>
                            <Paper elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: p.stock === 0 ? 'error.main' : 'warning.light', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => setPage('products')}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: p.stock === 0 ? 'error.main' : 'warning.main' }} />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.articleNumber}</Typography>
                              </Box>
                              <Chip
                                label={`${p.stock} / ${p.reorderLevel}`}
                                size="small"
                                color={p.stock === 0 ? 'error' : 'warning'}
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            </Paper>
                          </Grid>
                        ))}
                        {attnProducts.length > 6 && (
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => setPage('products')}>
                              +{attnProducts.length - 6} {t('more')} →
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  );
                })()}

                {/* STAFF quick actions */}
                {auth.role === 'STAFF' && (
                  <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>
                      {t('quickActions')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<ArrowUpIcon />}
                        sx={{ flex: 1, py: 2 }}
                        onClick={() => { setMovementForm((f) => ({ ...f, movementType: 'IN' })); setMovementDialog(true); setPage('movements'); }}
                      >
                        {t('inboundDelivery')}
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="large"
                        startIcon={<ArrowDownIcon />}
                        sx={{ flex: 1, py: 2 }}
                        onClick={() => { setMovementForm((f) => ({ ...f, movementType: 'OUT' })); setMovementDialog(true); setPage('movements'); }}
                      >
                        {t('outboundPickup')}
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<InventoryIcon />}
                        sx={{ flex: 1, py: 2 }}
                        onClick={() => setPage('products')}
                      >
                        {t('viewProducts')}
                      </Button>
                    </Stack>
                  </Paper>
                )}

                {/* Movement trend + IN/OUT donut side by side */}
                <Grid container spacing={2} alignItems="stretch">
                  {/* Left: big IN/OUT donut */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(145deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))' : 'linear-gradient(145deg, rgba(99,102,241,0.04), rgba(255,255,255,1))' }}>
                      {allMovementsQ.isLoading ? <Skeleton variant="circular" width={200} height={200} /> : (
                        <PieChart
                          title={t('inOutBalance')}
                          donut
                          size={220}
                          slices={[
                            { label: t('stockIn'),  value: (allMovementsQ.data?.content ?? []).filter(m => m.movementType === 'IN').reduce((s,m) => s + m.quantity, 0),  color: '#10b981' },
                            { label: t('stockOut'), value: (allMovementsQ.data?.content ?? []).filter(m => m.movementType === 'OUT').reduce((s,m) => s + m.quantity, 0), color: '#ef4444' },
                          ].filter(s => s.value > 0)}
                        />
                      )}
                    </Paper>
                  </Grid>
                  {/* Right: bar chart */}
                  <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%', background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(145deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))' : 'linear-gradient(145deg, rgba(99,102,241,0.04), rgba(255,255,255,1))' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>{t('movementTrend')}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('inOutBalance')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} /><Typography variant="caption" color="text.secondary">IN</Typography></Stack>
                          <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} /><Typography variant="caption" color="text.secondary">OUT</Typography></Stack>
                        </Box>
                      </Stack>
                      {allMovementsQ.isLoading ? (
                        <Skeleton height={200} />
                      ) : (
                        <MovementTrendChart movements={allMovementsQ.data?.content ?? []} lang={lang} />
                      )}
                    </Paper>
                  </Grid>
                </Grid>

                {/* Recent movements */}
                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{t('recentMovements')}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('recentMovements')}</Typography>
                    </Box>
                  </Stack>
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('product')}</TableCell>
                          <TableCell>{t('type')}</TableCell>
                          <TableCell>{t('quantity')}</TableCell>
                          <TableCell>{t('date')}</TableCell>
                          <TableCell>{t('user')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allMovementsQ.isLoading ? (
                          <SkeletonRows cols={5} rows={3} />
                        ) : (allMovementsQ.data?.content ?? []).slice(0, 5).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <EmptyState
                                icon={<SwapVertIcon sx={{ fontSize: 'inherit' }} />}
                                title={t('noMovements')}
                                message={t('noMovementsMsg')}
                              />
                            </TableCell>
                          </TableRow>
                        ) : (
                          (allMovementsQ.data?.content ?? []).slice(0, 5).map((m) => (
                            <TableRow key={m.id} hover>
                              <TableCell sx={{ fontWeight: 500 }}>{m.productName}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={m.movementType}
                                  color={m.movementType === 'IN' ? 'success' : 'error'}
                                  variant="filled"
                                  sx={{ fontWeight: 700, minWidth: 42 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} color={m.movementType === 'IN' ? 'success.main' : 'error.main'}>
                                  {m.movementType === 'IN' ? '+' : '-'}{m.quantity}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{new Date(m.occurredAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                                  <Typography variant="caption" fontWeight={600}>{m.performedBy}</Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Stack>
            )
  );
}
