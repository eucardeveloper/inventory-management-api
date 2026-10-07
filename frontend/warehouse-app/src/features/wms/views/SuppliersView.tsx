'use client';

import React from 'react';
import { Box, Button, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Add as AddIcon, Business as BusinessIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { type Supplier } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';

interface SuppliersViewProps {
  t: (key: TKey) => string;
  perms: Permissions;
  setSupplierDialog: React.Dispatch<React.SetStateAction<Partial<Supplier> | null>>;
  suppliersQ: UseQueryResult<Supplier[], Error>;
  supplierProductCount: Map<number, number>;
  setDeleteSupplierDialog: React.Dispatch<React.SetStateAction<Supplier | null>>;
}

export function SuppliersView({ t, perms, setSupplierDialog, suppliersQ, supplierProductCount, setDeleteSupplierDialog }: SuppliersViewProps) {
  return (
(
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('suppliers')}
                  </Typography>
                  {perms.canManageSuppliers && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSupplierDialog({})}>
                      {t('addSupplier')}
                    </Button>
                  )}
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('companyName')}</TableCell>
                        <TableCell>{t('contactPerson')}</TableCell>
                        <TableCell>{t('email')}</TableCell>
                        <TableCell>{t('phone')}</TableCell>
                        <TableCell align="center">{t('productCount')}</TableCell>
                        {perms.canManageSuppliers && <TableCell sx={{ textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('actions')}</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {suppliersQ.isLoading ? (
                        <SkeletonRows cols={perms.canManageSuppliers ? 6 : 5} />
                      ) : (suppliersQ.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canManageSuppliers ? 6 : 5} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<BusinessIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noSuppliers')}
                              message={t('noSuppliersMsg')}
                              action={
                                perms.canManageSuppliers ? (
                                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSupplierDialog({})}>
                                    {t('addSupplier')}
                                  </Button>
                                ) : undefined
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (suppliersQ.data ?? []).map((s) => (
                          <TableRow key={s.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                  width: 34, height: 34, borderRadius: 2,
                                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                                }}>
                                  {(s.companyName ?? '?').slice(0,2).toUpperCase()}
                                </Box>
                                <Typography variant="body2" fontWeight={600}>{s.companyName}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{s.contactPerson ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'primary.main', fontSize: '0.8rem' }}>{s.email ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{s.phone ?? '—'}</TableCell>
                            <TableCell align="center">
                              <Chip size="small" label={supplierProductCount.get(s.id) ?? 0}
                                color={((supplierProductCount.get(s.id) ?? 0) > 0) ? 'primary' : 'default'}
                                variant={(supplierProductCount.get(s.id) ?? 0) > 0 ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 700, minWidth: 36 }} />
                            </TableCell>
                            {perms.canManageSuppliers && (
                              <TableCell align="center">
                                <IconButton size="small" onClick={() => setSupplierDialog({ ...s })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteSupplierDialog(s)}>
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
              </Stack>
            )
  );
}
