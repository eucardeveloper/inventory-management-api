'use client';

import React, { useState } from 'react';
import { Box, Button, IconButton, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Assignment as AssignmentIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { filterLabel } from '@/features/inventory/components/Shared';
import { type AuditFilters, type Page, type AuditEntry } from '@/hooks/useInventoryQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey, TRANSLATIONS } from '@/features/inventory/i18n';
import { formatCount, formatInt } from '@/features/inventory/format';
import { dateFormatHint, formatIsoDate, isReversedRange, parseDateInput } from '@/features/inventory/dateInput';
import { AUDIT_ACTIONS, buildAuditDescription, AUDIT_ENTITIES, auditActionLabel, auditEntityLabel, ipLabel } from '@/features/inventory/labels';
import { formatDateTime } from '@/features/inventory/dates';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, TableToolbar, type Tone } from '@/features/inventory/components/Primitives';

export const AUDIT_PAGE_SIZE = 25;

/** Each kind of event has its own colour: stock in green, stock out amber, create green, update blue, delete red, security amber. */
function actionTone(action: string): Tone {
  if (action.includes('DELETED') || action.includes('DEACTIVATED')) return 'error';
  if (action === 'STOCK_IN' || action.includes('CREATED') || action === 'USER_REGISTER') return 'success';
  if (action === 'STOCK_OUT' || action.includes('PASSWORD') || action.includes('ROLE')) return 'warning';
  if (action === 'STOCK_ADJUSTED') return 'violet';
  if (action.includes('UPDATED')) return 'primary';
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

/** Calendar button for a date field: opens the browser's date picker and hands back an ISO yyyy-mm-dd. */
function DatePickButton({ label, value, onPick }: { label: string; value?: string; onPick: (iso: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); el.click(); }
  };
  return (
    <InputAdornment position="end" sx={{ ml: 0 }}>
      <IconButton size="small" aria-label={label} onClick={open} sx={{ position: 'relative' }}>
        <CalendarIcon sx={{ fontSize: 18 }} />
        <input
          ref={ref} type="date" tabIndex={-1} aria-hidden="true" value={value ?? ''}
          onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
          style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        />
      </IconButton>
    </InputAdornment>
  );
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
      <TextField select inputProps={{ 'aria-label': t('entityType') }} value={auditFilters.entityType ?? ''}
        onChange={(e) => onFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
        SelectProps={{ displayEmpty: true }} InputProps={{ startAdornment: filterLabel(t('entityType')) }}
        sx={{ width: 220 }}>
        <MenuItem value="">{t('all')}</MenuItem>
        {AUDIT_ENTITIES.map((et) => <MenuItem key={et} value={et}>{auditEntityLabel(dict, et)}</MenuItem>)}
      </TextField>
      <TextField select inputProps={{ 'aria-label': t('action') }} value={auditFilters.action ?? ''}
        onChange={(e) => onFilters((f) => ({ ...f, action: e.target.value || undefined }))}
        SelectProps={{ displayEmpty: true }} InputProps={{ startAdornment: filterLabel(t('action')) }}
        sx={{ width: 260 }}>
        <MenuItem value="">{t('all')}</MenuItem>
        {AUDIT_ACTIONS.map((a) => <MenuItem key={a} value={a}>{auditActionLabel(dict, a)}</MenuItem>)}
      </TextField>
      {/* plain labelled date fields; the format shows as placeholder, and as helper text only when the input is wrong */}
      <TextField value={fromText} placeholder={hint} error={fromBad || rangeBad}
        helperText={fromBad ? t('dateInvalid').replace('{format}', hint) : rangeBad ? t('dateRangeInvalid') : undefined}
        onChange={(e) => { setFromText(e.target.value); applyDate('from', e.target.value); }}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off', 'aria-label': t('from') }} InputProps={{ startAdornment: filterLabel(t('from')), endAdornment: <DatePickButton label={t('from')} value={auditFilters.from ?? undefined} onPick={(iso) => { setFromText(formatIsoDate(iso, lang)); onFilters((f) => ({ ...f, from: iso })); }} /> }}
        sx={{ width: 230, position: 'relative' }} FormHelperTextProps={{ sx: { position: 'absolute', top: '100%', left: 0, m: 0, zIndex: 3, lineHeight: 1.25, whiteSpace: 'nowrap' } }} />
      <TextField value={toText} placeholder={hint} error={toBad || rangeBad}
        helperText={toBad ? t('dateInvalid').replace('{format}', hint) : undefined}
        onChange={(e) => { setToText(e.target.value); applyDate('to', e.target.value); }}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off', 'aria-label': t('to') }} InputProps={{ startAdornment: filterLabel(t('to')), endAdornment: <DatePickButton label={t('to')} value={auditFilters.to ?? undefined} onPick={(iso) => { setToText(formatIsoDate(iso, lang)); onFilters((f) => ({ ...f, to: iso })); }} /> }}
        sx={{ width: 230, position: 'relative' }} FormHelperTextProps={{ sx: { position: 'absolute', top: '100%', left: 0, m: 0, zIndex: 3, lineHeight: 1.25, whiteSpace: 'nowrap' } }} />
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
        <TableCard toolbar={toolbar} maxHeight="none">
          <Table size="small" sx={{ minWidth: { xs: 0, sm: 520 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56, color: 'text.secondary' }}>{t('rowNo')}</TableCell>
                <TableCell>{t('date')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('user')}</TableCell>
                <TableCell>{t('action')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('entityType')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, width: '26%' }}>{t('description')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('ipAddress')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditQ.isLoading ? (
                <SkeletonRows cols={7} />
              ) : (
                rows.map((a, i) => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{page * AUDIT_PAGE_SIZE + i + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: { xs: 'normal', sm: 'nowrap' }, minWidth: { xs: 84, sm: 0 }, color: 'text.secondary' }}>{formatDateTime(a.occurredAt, lang)}<Typography variant="caption" component="div" sx={{ display: { xs: 'block', sm: 'none' }, color: 'text.primary', fontWeight: 600 }}>{a.username}</Typography></TableCell>
                    <TableCell sx={{ fontWeight: 500, display: { xs: 'none', sm: 'table-cell' } }}>{a.username}</TableCell>
                    <TableCell><StatusChip label={auditActionLabel(dict, a.action)} tone={actionTone(a.action)} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>{auditEntityLabel(dict, a.entityType)}{a.entityId ? ` #${a.entityId}` : ''}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, minWidth: 260, maxWidth: 480 }}>
                      <Box sx={{ width: 'min(100%, 300px)', mx: 'auto', textAlign: 'left' }}>
                        <Typography variant="body2" noWrap title={buildAuditDescription(dict, a)}>{buildAuditDescription(dict, a)}</Typography>
                      </Box>
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
