'use client';

import React from 'react';
import { Box, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Delete as DeleteIcon, LockReset as LockResetIcon, People as PeopleIcon, SwapVert as SwapVertIcon } from '@mui/icons-material';
import { type UserRecord } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { WmsRole } from '@/features/wms/permissions';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions, type Tone } from '@/features/wms/components/Primitives';

interface UsersViewProps {
  t: (key: TKey) => string;
  usersQ: UseQueryResult<UserRecord[], Error>;
  auth: { username: string; role: WmsRole };
  onChangeRole: (u: UserRecord) => void;
  onResetPassword: (u: UserRecord) => void;
  onDelete: (u: UserRecord) => void;
}

const ROLE_TONE: Record<UserRecord['role'], Tone> = { ADMIN: 'primary', WAREHOUSE_MANAGER: 'info', STAFF: 'neutral' };

export function UsersView({ t, usersQ, auth, onChangeRole, onResetPassword, onDelete }: UsersViewProps) {
  const rows = usersQ.data ?? [];
  const adminCount = rows.filter((u) => u.role === 'ADMIN').length;
  const roleLabel = (r: UserRecord['role']) => (r === 'ADMIN' ? t('roleAdmin') : r === 'WAREHOUSE_MANAGER' ? t('roleWarehouseManager') : t('roleStaff'));

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('userManagement')}
        actions={usersQ.data ? <StatusChip icon={<PeopleIcon />} tone="primary" label={`${rows.length} ${t(rows.length === 1 ? 'user' : 'users')}`} /> : undefined}
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
                        <Tooltip title={lastAdmin ? t('lastAdminProtected') : t('changeRole')}>
                          <span>
                            <IconButton size="small" aria-label={t('changeRole')} disabled={lastAdmin} onClick={() => onChangeRole(u)}><SwapVertIcon fontSize="small" /></IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('changePassword')}>
                          <IconButton size="small" aria-label={t('changePassword')} onClick={() => onResetPassword(u)}><LockResetIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={deleteHint}>
                          <span>
                            <IconButton size="small" color="error" aria-label={t('deleteUser')} disabled={isSelf || lastAdmin} onClick={() => onDelete(u)}><DeleteIcon fontSize="small" /></IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
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
