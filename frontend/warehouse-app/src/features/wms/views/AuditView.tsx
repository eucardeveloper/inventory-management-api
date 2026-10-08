'use client';

import React from 'react';
import { Button, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { type AuditFilters, type Page, type AuditEntry } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { formatDateTime } from '@/features/wms/dates';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, type Tone } from '@/features/wms/components/Primitives';

export const AUDIT_PAGE_SIZE = 25;

const ENTITY_TYPES = ['User', 'Product', 'Supplier', 'Stock'];
const ACTIONS = [
  'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'TOKEN_REFRESHED',
  'USER_ROLE_CHANGED', 'USER_PASSWORD_CHANGED', 'USER_DELETED',
  'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED',
  'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED',
  'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTED',
];

function actionTone(action: string): Tone {
  if (action.includes('DELETED') || action.includes('DEACTIVATED')) return 'error';
  if (action.includes('CREATED') || action === 'STOCK_IN') return 'success';
  if (action.includes('PASSWORD') || action.includes('ROLE')) return 'warning';
  if (action.startsWith('USER_LOG') || action === 'TOKEN_REFRESHED') return 'neutral';
  return 'primary';
}

interface AuditViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  auditFilters: AuditFilters;
  onFilters: (updater: (f: AuditFilters) => AuditFilters) => void;
  onClear: () => void;
  auditQ: UseQueryResult<Page<AuditEntry>, Error>;
  page: number;
  onPage: (p: number) => void;
}

export function AuditView({ t, lang, auditFilters, onFilters, onClear, auditQ, page, onPage }: AuditViewProps) {
  const rows = auditQ.data?.content ?? [];
  const hasFilter = Boolean(auditFilters.entityType || auditFilters.action || auditFilters.from || auditFilters.to);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader title={t('auditLog')} subtitle={auditQ.data ? `${auditQ.data.totalElements}` : undefined} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <TextField select size="small" label={t('entityType')} value={auditFilters.entityType ?? ''}
          onChange={(e) => onFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
          sx={{ flex: 1, minWidth: { sm: 150 }, bgcolor: 'background.paper' }}>
          <MenuItem value="">{t('all')}</MenuItem>
          {ENTITY_TYPES.map((et) => <MenuItem key={et} value={et}>{et}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('action')} value={auditFilters.action ?? ''}
          onChange={(e) => onFilters((f) => ({ ...f, action: e.target.value || undefined }))}
          sx={{ flex: 1, minWidth: { sm: 200 }, bgcolor: 'background.paper' }}>
          <MenuItem value="">{t('all')}</MenuItem>
          {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
        <TextField size="small" label={t('from')} type="date" value={auditFilters.from ?? ''}
          onChange={(e) => onFilters((f) => ({ ...f, from: e.target.value || undefined }))}
          InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: { sm: 150 }, bgcolor: 'background.paper' }} />
        <TextField size="small" label={t('to')} type="date" value={auditFilters.to ?? ''}
          onChange={(e) => onFilters((f) => ({ ...f, to: e.target.value || undefined }))}
          InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: { sm: 150 }, bgcolor: 'background.paper' }} />
        {hasFilter && <Button variant="outlined" onClick={onClear}>{t('clearFilters')}</Button>}
      </Stack>

      {auditQ.isError ? (
        <ErrorState title={t('loadError')} message={auditQ.error?.message ?? t('loadErrorMsg')} onRetry={() => auditQ.refetch()} retryLabel={t('retry')} />
      ) : !auditQ.isLoading && rows.length === 0 ? (
        <SectionCard>
          <EmptyState icon={<AssignmentIcon />} title={hasFilter ? t('noResults') : t('noAudit')} message={hasFilter ? t('noResultsMsg') : t('noAuditMsg')}
            action={hasFilter ? <Button variant="outlined" onClick={onClear}>{t('clearFilters')}</Button> : undefined} />
        </SectionCard>
      ) : (
        <TableCard>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('date')}</TableCell>
                <TableCell>{t('user')}</TableCell>
                <TableCell>{t('action')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('entityType')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('description')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('ipAddress')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditQ.isLoading ? (
                <SkeletonRows cols={6} />
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{formatDateTime(a.occurredAt, lang)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{a.username}</TableCell>
                    <TableCell><StatusChip label={a.action.replace(/_/g, ' ')} tone={actionTone(a.action)} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{a.entityType ?? '—'}{a.entityId ? ` #${a.entityId}` : ''}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, maxWidth: 320 }}>
                      <Typography variant="body2" noWrap title={a.description ?? undefined}>{a.description ?? '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontFamily: 'monospace', fontSize: '0.75rem' }}>{a.ipAddress ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {(auditQ.data?.totalElements ?? 0) > AUDIT_PAGE_SIZE && (
            <TablePagination
              component="div"
              count={auditQ.data?.totalElements ?? 0}
              page={page}
              onPageChange={(_, p) => onPage(p)}
              rowsPerPage={AUDIT_PAGE_SIZE}
              rowsPerPageOptions={[AUDIT_PAGE_SIZE]}
              labelRowsPerPage={t('rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('ofLabel')} ${count}`}
            />
          )}
        </TableCard>
      )}
    </Stack>
  );
}
