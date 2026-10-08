'use client';

import React from 'react';
import { Box, Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Business as BusinessIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { type Supplier } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { Permissions } from '@/features/wms/permissions';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions } from '@/features/wms/components/Primitives';

interface SuppliersViewProps {
  t: (key: TKey) => string;
  perms: Permissions;
  suppliersQ: UseQueryResult<Supplier[], Error>;
  supplierProductCount: Map<number, number>;
  onAdd: () => void;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
}

export function SuppliersView({ t, perms, suppliersQ, supplierProductCount, onAdd, onEdit, onDelete }: SuppliersViewProps) {
  const rows = suppliersQ.data ?? [];
  const showActions = perms.canEditSuppliers || perms.canDeleteSuppliers;
  const colCount = 5 + (showActions ? 1 : 0);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('suppliers')}
        subtitle={suppliersQ.data ? `${rows.length}` : undefined}
        actions={perms.canEditSuppliers ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{t('addSupplier')}</Button>
        ) : <StatusChip label={t('viewOnly')} tone="neutral" />}
      />

      {suppliersQ.isError ? (
        <ErrorState title={t('loadError')} message={suppliersQ.error?.message ?? t('loadErrorMsg')} onRetry={() => suppliersQ.refetch()} retryLabel={t('retry')} />
      ) : !suppliersQ.isLoading && rows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<BusinessIcon />}
            title={t('noSuppliers')}
            message={t('noSuppliersMsg')}
            action={perms.canEditSuppliers ? <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{t('addSupplier')}</Button> : undefined}
          />
        </SectionCard>
      ) : (
        <TableCard>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('companyName')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('contactPerson')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('email')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('phone')}</TableCell>
                <TableCell align="right">{t('productCount')}</TableCell>
                {showActions && <TableCell sx={stickyActions}>{t('actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliersQ.isLoading ? (
                <SkeletonRows cols={colCount} />
              ) : (
                rows.map((s) => {
                  const count = supplierProductCount.get(s.id) ?? 0;
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ maxWidth: { xs: 200, sm: 320 } }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{s.companyName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ display: { xs: 'block', md: 'none' } }}>
                          {s.contactPerson ?? ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{s.contactPerson ?? '—'}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, maxWidth: 240 }}>
                        <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email ?? '—'}</Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary', whiteSpace: 'nowrap' }}>{s.phone ?? '—'}</TableCell>
                      <TableCell align="right"><StatusChip label={count} tone={count > 0 ? 'primary' : 'neutral'} /></TableCell>
                      {showActions && (
                        <TableCell sx={stickyActions}>
                          {perms.canEditSuppliers && (
                            <Tooltip title={t('edit')}>
                              <IconButton size="small" aria-label={t('edit')} onClick={() => onEdit(s)}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                          {perms.canDeleteSuppliers && (
                            <Tooltip title={t('delete')}>
                              <IconButton size="small" color="error" aria-label={t('delete')} onClick={() => onDelete(s)}><DeleteIcon fontSize="small" /></IconButton>
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
        </TableCard>
      )}
    </Stack>
  );
}
