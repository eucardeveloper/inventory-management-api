'use client';

import React from 'react';
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Delete as DeleteIcon, LockReset as LockResetIcon, People as PeopleIcon, SwapVert as SwapVertIcon } from '@mui/icons-material';
import { type UserRecord } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/wms/i18n';
import { formatCount } from '@/features/wms/format';
import { WmsRole } from '@/features/wms/permissions';
import { ActionButton, EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions, type Tone } from '@/features/wms/components/Primitives';

interface UsersViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  usersQ: UseQueryResult<UserRecord[], Error>;
  auth: { username: string; role: WmsRole };
  onChangeRole: (u: UserRecord) => void;
  onResetPassword: (u: UserRecord) => void;
  onDelete: (u: UserRecord) => void;
}

const ROLE_TONE: Record<UserRecord['role'], Tone> = { ADMIN: 'primary', WAREHOUSE_MANAGER: 'info', STAFF: 'neutral' };

export function UsersView({ t, lang, usersQ, auth, onChangeRole, onResetPassword, onDelete }: UsersViewProps) {
  const rows = usersQ.data ?? [];
  const adminCount = rows.filter((u) => u.role === 'ADMIN').length;
  const roleLabel = (r: UserRecord['role']) => (r === 'ADMIN' ? t('roleAdmin') : r === 'WAREHOUSE_MANAGER' ? t('roleWarehouseManager') : t('roleStaff'));

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('userManagement')}
        subtitle={usersQ.data ? formatCount(rows.length, t('unitUsers'), lang) : undefined}
      />

      {usersQ.isError ? (
        <ErrorState title={t('loadError')} message={usersQ.error?.message ?? t('loadErrorMsg')} onRetry={() => usersQ.refetch()} retryLabel={t('retry')} />
      ) : !usersQ.isLoading && rows.length === 0 ? (
        <SectionCard><EmptyState icon={<PeopleIcon />} title={t('noUsers')} message={t('noUsersMsg')} /></SectionCard>
      ) : (
        <TableCard>
          <Table size="small" sx={{ minWidth: 420 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('username')}</TableCell>
                <TableCell>{t('role')}</TableCell>
                <TableCell sx={stickyActions}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersQ.isLoading ? (
                <SkeletonRows cols={3} />
              ) : (
                rows.map((u) => {
                  const isSelf = u.username === auth.username;
                  const lastAdmin = u.role === 'ADMIN' && adminCount <= 1;
                  const deleteHint = isSelf ? t('cannotDeleteSelf') : lastAdmin ? t('lastAdminProtected') : t('deleteUser');
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </Box>
                          <Typography variant="body2" fontWeight={600} noWrap>{u.username}</Typography>
                          {isSelf && <StatusChip label={t('youAreHere')} tone="primary" />}
                        </Stack>
                      </TableCell>
                      <TableCell><StatusChip label={roleLabel(u.role)} tone={ROLE_TONE[u.role]} /></TableCell>
                      <TableCell sx={stickyActions}>
                        <ActionButton label={t('changeRole')} icon={<SwapVertIcon fontSize="small" />} disabled={lastAdmin} disabledReason={t('lastAdminProtected')} onClick={() => onChangeRole(u)} />
                        <ActionButton label={t('changePassword')} icon={<LockResetIcon fontSize="small" />} onClick={() => onResetPassword(u)} />
                        <ActionButton label={t('deleteUser')} icon={<DeleteIcon fontSize="small" />} color="error" disabled={isSelf || lastAdmin} disabledReason={deleteHint} onClick={() => onDelete(u)} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableCard>
      )}

      {/* Role boundaries, stated plainly (the API enforces them; this is documentation for admins) */}
      <SectionCard sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>{t('rolesOverview')}</Typography>
        <Stack spacing={1.25}>
          {([['ADMIN', 'roleAdminDesc'], ['WAREHOUSE_MANAGER', 'roleManagerDesc'], ['STAFF', 'roleStaffDesc']] as const).map(([role, desc]) => (
            <Stack key={role} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} alignItems={{ sm: 'center' }}>
              <Box sx={{ width: { sm: 190 }, flexShrink: 0 }}><StatusChip label={roleLabel(role)} tone={ROLE_TONE[role]} /></Box>
              <Typography variant="body2" color="text.secondary">{t(desc)}</Typography>
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
