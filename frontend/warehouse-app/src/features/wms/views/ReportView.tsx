'use client';

import { Button, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, CheckCircle as CheckCircleIcon, Inventory as InventoryIcon, Warning as WarningIcon } from '@mui/icons-material';
import { type StockReport } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/constants';
import { KpiCard, EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';
import { PieChart } from '@/features/wms/components/PieChart';
import { exportExcel, exportPdf } from '@/features/wms/exporters';

interface ReportViewProps {
  t: (key: TKey) => string;
  reportWithFifo: { fifoValue: number; productId: number; productName: string; articleNumber: string; totalIn: number; totalOut: number; currentStock: number; reorderLevel?: number; isLowStock: boolean; }[];
  perms: Permissions;
  lang: "en" | "tr" | "de";
  reportQ: UseQueryResult<StockReport[], Error>;
}

export function ReportView({ t, reportWithFifo, perms, lang, reportQ }: ReportViewProps) {
  return (
(
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Typography variant="h5" fontWeight={700}>{t('stockReport')}</Typography>
                  <Stack direction="row" gap={1}>
                    <Button size="small" variant="outlined" color="success" startIcon={<span style={{fontSize:'0.9em'}}>XLS</span>}
                      onClick={() => exportExcel(
                        reportWithFifo.map(r => ({
                          [t('articleNumber')]: r.articleNumber,
                          [t('productName')]: r.productName,
                          [t('totalIn')]: r.totalIn,
                          [t('totalOut')]: r.totalOut,
                          [t('currentStock')]: r.currentStock,
                          [t('fifoValue')]: r.fifoValue ? r.fifoValue.toFixed(2) : '',
                          [t('reorderLevel')]: r.reorderLevel ?? '',
                          [t('status')]: r.isLowStock ? t('lowStock') : t('ok'),
                        })),
                        'stock-report'
                      )}>Excel</Button>
                    <Button size="small" variant="contained" color="error" startIcon={<span style={{fontSize:'0.9em'}}>PDF</span>}
                      onClick={() => exportPdf(
                        t('stockReport'),
                        [t('articleNumber'), t('productName'), t('totalIn'), t('totalOut'), t('currentStock'), t('fifoValue'), t('reorderLevel'), t('status')],
                        reportWithFifo.map(r => [
                          r.articleNumber, r.productName,
                          String(r.totalIn), String(r.totalOut),
                          String(r.currentStock), r.fifoValue ? r.fifoValue.toFixed(2) : '',
                          String(r.reorderLevel ?? ''),
                          r.isLowStock ? t('lowStock') : t('ok'),
                        ]),
                        'stock-report'
                      )}>PDF</Button>
                  </Stack>
                </Stack>

                {/* Summary KPI cards */}
                {reportWithFifo.length > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <KpiCard
                        label={t('kpiTotalProducts')}
                        value={reportWithFifo.length}
                        icon={<InventoryIcon />}
                        color="primary.main"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <KpiCard
                        label={t('kpiLowStock')}
                        value={reportWithFifo.filter((r) => r.isLowStock).length}
                        icon={<WarningIcon />}
                        color="warning.main"
                      />
                    </Grid>
                    {perms.canSeeFinancials && (
                      <Grid item xs={12} sm={4}>
                        <KpiCard
                          label={t('fifoValue')}
                          value={formatCurrency(reportWithFifo.reduce((s, r) => s + (r.fifoValue ?? 0), 0), lang)}
                          icon={<AssessmentIcon />}
                          color="success.main"
                        />
                      </Grid>
                    )}
                  </Grid>
                )}

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
                        <TableCell>{t('articleNumber')}</TableCell>
                        <TableCell align="center">{t('totalIn')}</TableCell>
                        <TableCell align="center">{t('totalOut')}</TableCell>
                        <TableCell align="center">{t('currentStock')}</TableCell>
                        {perms.canSeeFinancials && <TableCell align="center">{t('fifoValue')}</TableCell>}
                        <TableCell align='right'>{t('isLowStock')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportQ.isLoading ? (
                        <SkeletonRows cols={perms.canSeeFinancials ? 7 : 6} />
                      ) : reportWithFifo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canSeeFinancials ? 7 : 6} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<AssessmentIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noReport')}
                              message={t('noReportMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportWithFifo.map((r) => (
                          <TableRow key={r.productId} hover>
                            <TableCell>{r.productName}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.articleNumber}</TableCell>
                            <TableCell align="center" sx={{ color: 'success.main', fontWeight: 600 }}>{r.totalIn}</TableCell>
                            <TableCell align="center" sx={{ color: 'error.main', fontWeight: 600 }}>{r.totalOut}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{r.currentStock}</TableCell>
                            {perms.canSeeFinancials && (
                              <TableCell align="center">{formatCurrency(r.fifoValue, lang)}</TableCell>
                            )}
                            <TableCell>
                              {r.isLowStock ? (
                                <Chip size="small" label={t('lowStock')} color="warning" icon={<WarningIcon />} />
                              ) : (
                                <Chip size="small" label="OK" color="success" variant="outlined" icon={<CheckCircleIcon />} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )
  );
}
