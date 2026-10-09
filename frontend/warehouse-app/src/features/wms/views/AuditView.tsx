'use client';

import React, { useState } from 'react';
import { Button, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { type AuditFilters, type Page, type AuditEntry } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey, TRANSLATIONS } from '@/features/wms/i18n';
import { formatCount, formatInt } from '@/features/wms/format';
import { dateFormatHint, formatIsoDate, isReversedRange, parseDateInput } from '@/features/wms/dateInput';
import { AUDIT_ACTIONS, buildAuditDescription, AUDIT_ENTITIES, auditActionLabel, auditEntityLabel, ipLabel } from '@/features/wms/labels';
import { formatDateTime } from '@/features/wms/dates';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, TableToolbar, type Tone } from '@/features/wms/components/Primitives';

export const AUDIT_PAGE_SIZE = 25;

/** Only destructive and security-relevant events get a colour; everything else stays neutral. */
function actionTone(action: string): Tone {
  if (action.includes('DELETED') || action.includes('DEACTIVATED')) return 'error';
  if (action.includes('PASSWORD') || action.includes('ROLE')) return 'warning';
  return 'neutral';
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
  const dict = TRANSLATIONS[lang] as Record<string, string>;
  // Date entry is a text field in the interface language's format (the browser's native picker format
  // cannot be controlled). The API filter always receives ISO yyyy-mm-dd.
  const [fromText, setFromText] = useState(formatIsoDate(auditFilters.from, lang));
  const [toText, setToText] = useState(formatIsoDate(auditFilters.to, lang));
  const fromBad = fromText.trim() !== '' && parseDateInput(fromText) === null;
  const toBad = toText.trim() !== '' && parseDateInput(toText) === null;
  const rangeBad = isReversedRange(auditFilters.from, auditFilters.to);
  const hint = dateFormatHint(lang);
  const applyDate = (key: 'from' | 'to', text: string) => {
    const iso = parseDateInput(text);
    onFilters((f) => ({ ...f, [key]: text.trim() === '' || iso === null ? undefined : iso }));
  };
  const clearAll = () => { setFromText(''); setToText(''); onClear(); };
  const rows = auditQ.data?.content ?? [];
  const hasFilter = Boolean(auditFilters.entityType || auditFilters.action || auditFilters.from || auditFilters.to);

  const filters = (
    <>
      <TextField select label={t('entityType')} value={auditFilters.entityType ?? ''}
        onChange={(e) => onFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
        sx={{ width: 160 }}>
        <MenuItem value="">{t('all')}</MenuItem>
        {AUDIT_ENTITIES.map((et) => <MenuItem key={et} value={et}>{auditEntityLabel(dict, et)}</MenuItem>)}
      </TextField>
      <TextField select label={t('action')} value={auditFilters.action ?? ''}
        onChange={(e) => onFilters((f) => ({ ...f, action: e.target.value || undefined }))}
        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
        sx={{ width: 220 }}>
        <MenuItem value="">{t('all')}</MenuItem>
        {AUDIT_ACTIONS.map((a) => <MenuItem key={a} value={a}>{auditActionLabel(dict, a)}</MenuItem>)}
      </TextField>
      {/* plain labelled date fields; the format shows as placeholder, and as helper text only when the input is wrong */}
      <TextField label={t('from')} value={fromText} placeholder={hint} error={fromBad || rangeBad}
        helperText={fromBad ? t('dateInvalid').replace('{format}', hint) : rangeBad ? t('dateRangeInvalid') : undefined}
        onChange={(e) => { setFromText(e.target.value); applyDate('from', e.target.value); }}
        InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
        sx={{ width: 152 }} />
      <TextField label={t('to')} value={toText} placeholder={hint} error={toBad || rangeBad}
        helperText={toBad ? t('dateInvalid').replace('{format}', hint) : undefined}
        onChange={(e) => { setToText(e.target.value); applyDate('to', e.target.value); }}
        InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
        sx={{ width: 152 }} />
      {hasFilter && <Button variant="text" onClick={clearAll}>{t('clearFilters')}</Button>}
    </>
  );
  const toolbar = <TableToolbar count={auditQ.data ? formatCount(auditQ.data.totalElements, t('unitEvents'), lang) : undefined}>{filters}</TableToolbar>;

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader title={t('auditLog')} subtitle={t('subAudit')} />

      {auditQ.isError ? (
        <ErrorState title={t('loadError')} message={auditQ.error?.message ?? t('loadErrorMsg')} onRetry={() => auditQ.refetch()} retryLabel={t('retry')} />
      ) : !auditQ.isLoading && rows.length === 0 ? (
        <SectionCard>
          {hasFilter && toolbar}
          <EmptyState icon={<AssignmentIcon />} title={hasFilter ? t('noResults') : t('noAudit')} message={hasFilter ? t('noResultsMsg') : t('noAuditMsg')}
            action={hasFilter ? <Button variant="outlined" onClick={clearAll}>{t('clearFilters')}</Button> : undefined} />
        </SectionCard>
      ) : (
        <TableCard toolbar={toolbar}>
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
                    <TableCell sx={{ fontWeight: 500 }}>{a.username}</TableCell>
                    <TableCell><StatusChip label={auditActionLabel(dict, a.action)} tone={actionTone(a.action)} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>{auditEntityLabel(dict, a.entityType)}{a.entityId ? ` #${a.entityId}` : ''}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, minWidth: 260, maxWidth: 480 }}>
                      <Typography variant="body2" noWrap title={buildAuditDescription(dict, a)}>{buildAuditDescription(dict, a)}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary', whiteSpace: 'nowrap' }}>{ipLabel(dict, a.ipAddress)}</TableCell>
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
              labelDisplayedRows={({ from, to, count }) => `${formatInt(from, lang)}–${formatInt(to, lang)} ${t('ofLabel')} ${formatInt(count, lang)}`}
            />
          )}
        </TableCard>
      )}
    </Stack>
  );
}
