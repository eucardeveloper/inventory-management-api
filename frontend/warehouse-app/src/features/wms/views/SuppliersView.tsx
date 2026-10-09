'use client';

import React from 'react';
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Add as AddIcon, Business as BusinessIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { type Supplier } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { formatCount, formatInt } from '@/features/wms/format';
import { Permissions } from '@/features/wms/permissions';
import { ActionButton, EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions } from '@/features/wms/components/Primitives';

interface SuppliersViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  suppliersQ: UseQueryResult<Supplier[], Error>;
  supplierProductCount: Map<number, number>;
  onAdd: () => void;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
}

export function SuppliersView({ t, lang, perms, suppliersQ, supplierProductCount, onAdd, onEdit, onDelete }: SuppliersViewProps) {
  const rows = suppliersQ.data ?? [];
  const showActions = perms.canEditSuppliers || perms.canDeleteSuppliers;
  const colCount = 5 + (showActions ? 1 : 0);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('suppliers')}
        subtitle={suppliersQ.data ? formatCount(rows.length, t('unitSuppliers'), lang) : undefined}
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
                      <TableCell align="right"><StatusChip label={formatInt(count, lang)} tone={count > 0 ? 'primary' : 'neutral'} /></TableCell>
                      {showActions && (
                        <TableCell sx={stickyActions}>
                          {perms.canEditSuppliers && (
                            <ActionButton label={t('edit')} icon={<EditIcon fontSize="small" />} onClick={() => onEdit(s)} />
                          )}
                          {perms.canDeleteSuppliers && (
                            <ActionButton label={t('delete')} icon={<DeleteIcon fontSize="small" />} color="error" onClick={() => onDelete(s)} />
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
