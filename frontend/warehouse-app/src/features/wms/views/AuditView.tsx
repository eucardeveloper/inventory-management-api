'use client';

import React from 'react';
import { Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { type AuditFilters, type Page, type AuditEntry } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';

interface AuditViewProps {
  t: (key: TKey) => string;
  auditFilters: AuditFilters;
  setAuditFilters: React.Dispatch<React.SetStateAction<AuditFilters>>;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  auditQ: UseQueryResult<Page<AuditEntry>, Error>;
  auditPage: number;
}

export function AuditView({ t, auditFilters, setAuditFilters, setAuditPage, auditQ, auditPage }: AuditViewProps) {
  return (
(
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>{t('auditLog')}</Typography>

                {/* Audit filters */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                  <TextField
                    select size="small"
                    label={t('entityType')}
                    value={auditFilters.entityType ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
                    sx={{ flex: 1, minWidth: 160 }}
                  >
                    <MenuItem value="">— {t('all')} —</MenuItem>
                    {['User','Product','Supplier','Stock'].map((et) => (
                      <MenuItem key={et} value={et}>{et}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select size="small"
                    label={t('action')}
                    value={auditFilters.action ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, action: e.target.value || undefined }))}
                    sx={{ flex: 1, minWidth: 200 }}
                  >
                    <MenuItem value="">— {t('all')} —</MenuItem>
                    {['USER_LOGIN','USER_LOGOUT','USER_REGISTER','TOKEN_REFRESHED',
                      'USER_ROLE_CHANGED','USER_PASSWORD_CHANGED','USER_DELETED',
                      'PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_DEACTIVATED',
                      'SUPPLIER_CREATED','SUPPLIER_UPDATED','SUPPLIER_DELETED',
                      'STOCK_IN','STOCK_OUT','STOCK_ADJUSTED'].map((a) => (
                      <MenuItem key={a} value={a}>{a.replace(/_/g,' ')}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label={t('from')}
                    type="date"
                    value={auditFilters.from ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, from: e.target.value || undefined }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: 140 }}
                  />
                  <TextField
                    size="small"
                    label={t('to')}
                    type="date"
                    value={auditFilters.to ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, to: e.target.value || undefined }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: 140 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => { setAuditFilters({}); setAuditPage(0); }}
                  >
                    {t('clearFilters')}
                  </Button>
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('user')}</TableCell>
                        <TableCell>{t('action')}</TableCell>
                        <TableCell>{t('entityType')}</TableCell>
                        <TableCell>{t('description')}</TableCell>
                        <TableCell>{t('ipAddress')}</TableCell>
                        <TableCell>{t('date')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditQ.isLoading ? (
                        <SkeletonRows cols={6} />
                      ) : (auditQ.data?.content ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<AssignmentIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noAudit')}
                              message={t('noAuditMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (auditQ.data?.content ?? []).map((a) => (
                          <TableRow key={a.id} hover>
                            <TableCell>{a.username}</TableCell>
                            <TableCell>
                              <Chip size="small" label={a.action} variant="outlined" />
                            </TableCell>
                            <TableCell>{a.entityType ?? '—'}</TableCell>
                            <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.description ?? '—'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{a.ipAddress ?? '—'}</TableCell>
                            <TableCell>{new Date(a.occurredAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={auditQ.data?.totalElements ?? 0}
                    page={auditPage}
                    onPageChange={(_, p) => setAuditPage(p)}
                    rowsPerPage={25}
                    rowsPerPageOptions={[25]}
                    labelRowsPerPage={t('rowsPerPage')}
                  />
                </TableContainer>
              </Stack>
            )
  );
}
