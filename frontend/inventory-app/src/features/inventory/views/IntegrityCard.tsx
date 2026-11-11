'use client';

import React from 'react';
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useStockIntegrity } from '@/hooks/useInventoryQueries';
import { Lang, TKey } from '@/features/inventory/i18n';
import { localeOf } from '@/features/inventory/dates';
import { SectionCard } from '@/features/inventory/components/Primitives';

/**
 * Cross-checks, per product, the cached stock, the sum of the open lots, the net of the append-only ledger and
 * the last recorded stock-after. Shown to ADMIN and INVENTORY_MANAGER only (the API refuses STAFF with 403).
 */
export function IntegrityCard({ t, lang }: { t: (key: TKey) => string; lang: Lang }) {
  const q = useStockIntegrity();
  const data = q.data;
  const ok = data !== undefined && data.inconsistentProducts === 0;
  const checkedAt = data ? new Date(data.checkedAt).toLocaleString(localeOf(lang)) : '';

  return (
    <SectionCard>
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600}>{t('integrityTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('integritySubtitle')}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {q.isLoading && <Chip size="small" label={t('integrityChecking')} />}
            {q.isError && <Chip size="small" color="warning" icon={<ErrorIcon />} label={t('integrityUnavailable')} />}
            {ok && <Chip size="small" color="success" icon={<CheckCircleIcon />} label={`${t('integrityAllOk')} (${data.checkedProducts})`} />}
            {data && !ok && <Chip size="small" color="error" icon={<ErrorIcon />} label={`${t('integrityProblems')}: ${data.inconsistentProducts} / ${data.checkedProducts}`} />}
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => q.refetch()} disabled={q.isFetching}>{t('integrityRun')}</Button>
          </Stack>
        </Stack>
        {data && <Typography variant="caption" color="text.secondary">{t('integrityCheckedAt')}: {checkedAt}</Typography>}
        {data && data.rows.length > 0 && (
          <Table size="small" aria-label={t('integrityTitle')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('articleNumber')}</TableCell>
                <TableCell>{t('productName')}</TableCell>
                <TableCell align="right">{t('integrityColCache')}</TableCell>
                <TableCell align="right">{t('integrityColLots')}</TableCell>
                <TableCell align="right">{t('integrityColLedger')}</TableCell>
                <TableCell align="right">{t('integrityColLast')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((r) => (
                <TableRow key={r.productId}>
                  <TableCell>{r.articleNumber}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell align="right">{r.stock}</TableCell>
                  <TableCell align="right">{r.lotTotal}</TableCell>
                  <TableCell align="right">{r.ledgerNet}</TableCell>
                  <TableCell align="right">{r.lastStockAfter}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </SectionCard>
  );
}
