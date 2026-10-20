'use client';

import React from 'react';
import { Box, Divider, IconButton, Menu, MenuItem, ListItemIcon, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { MoreHoriz as MoreHorizIcon, Delete as DeleteIcon, LockReset as LockResetIcon, People as PeopleIcon, SwapVert as SwapVertIcon } from '@mui/icons-material';
import { type UserRecord } from '@/hooks/useInventoryQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { Lang, TKey } from '@/features/inventory/i18n';
import { InventoryRole } from '@/features/inventory/permissions';
import { initialsOf } from '@/features/inventory/labels';
import { EmptyState, ErrorState, PageHeader, SectionCard, SkeletonRows, StatusChip, TableCard, stickyActions, type Tone } from '@/features/inventory/components/Primitives';

interface UsersViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  usersQ: UseQueryResult<UserRecord[], Error>;
  auth: { username: string; role: InventoryRole };
  onChangeRole: (u: UserRecord) => void;
  onResetPassword: (u: UserRecord) => void;
  onDelete: (u: UserRecord) => void;
}

const ROLE_TONE: Record<UserRecord['role'], Tone> = { ADMIN: 'primary', INVENTORY_MANAGER: 'neutral', STAFF: 'neutral' };

/** Row actions in one "..." menu: unavailable actions stay visible but disabled, with the reason as the item's text. */
function UserActions({ t, u, isSelf, lastAdmin, onChangeRole, onResetPassword, onDelete }: {
  t: (key: TKey) => string; u: UserRecord; isSelf: boolean; lastAdmin: boolean;
  onChangeRole: (u: UserRecord) => void; onResetPassword: (u: UserRecord) => void; onDelete: (u: UserRecord) => void;
}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (fn: (u: UserRecord) => void) => () => { close(); fn(u); };
  return (
    <>
      <IconButton size="small" aria-label={`${t('actions')}: ${u.username}`} aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreHorizIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem disabled={lastAdmin} onClick={run(onChangeRole)}>
          <ListItemIcon><SwapVertIcon fontSize="small" /></ListItemIcon>{t('changeRole')}
        </MenuItem>
        <MenuItem onClick={run(onResetPassword)}>
          <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>{t('changePassword')}
        </MenuItem>
        <Divider />
        <MenuItem disabled={isSelf || lastAdmin} onClick={run(onDelete)} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}><DeleteIcon fontSize="small" /></ListItemIcon>{t('deleteUser')}
        </MenuItem>
        {(isSelf || lastAdmin) && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ px: 2, pt: 0.5, pb: 1, maxWidth: 240 }}>
            {isSelf ? t('cannotDeleteSelf') : t('lastAdminProtected')}
          </Typography>
        )}
      </Menu>
    </>
  );
}

export function UsersView({ t, usersQ, auth, onChangeRole, onResetPassword, onDelete }: UsersViewProps) {
  const rows = usersQ.data ?? [];
  const adminCount = rows.filter((u) => u.role === 'ADMIN').length;
  const roleLabel = (r: UserRecord['role']) => (r === 'ADMIN' ? t('roleAdmin') : r === 'INVENTORY_MANAGER' ? t('roleInventoryManager') : t('roleStaff'));

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeader title={t('userManagement')} subtitle={t('subUsers')} />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
      {usersQ.isError ? (
        <ErrorState title={t('loadError')} message={usersQ.error?.message ?? t('loadErrorMsg')} onRetry={() => usersQ.refetch()} retryLabel={t('retry')} />
      ) : !usersQ.isLoading && rows.length === 0 ? (
        <SectionCard><EmptyState icon={<PeopleIcon />} title={t('noUsers')} message={t('noUsersMsg')} /></SectionCard>
      ) : (
        <TableCard>
          <Table size="small" sx={{ minWidth: { xs: 0, sm: 420 } }}>
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
                                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ minWidth: 0 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(53,104,237,0.12)', color: 'primary.main', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                            {initialsOf(u.username)}
                          </Box>
                          <Typography variant="body2" fontWeight={500} noWrap>{u.username}</Typography>
                          {isSelf && <StatusChip label={t('youAreHere')} tone="primary" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />}
                        </Stack>
                      </TableCell>
                      <TableCell><StatusChip label={roleLabel(u.role)} tone={ROLE_TONE[u.role]} /></TableCell>
                      <TableCell sx={stickyActions}>
                        <UserActions t={t} u={u} isSelf={isSelf} lastAdmin={lastAdmin} onChangeRole={onChangeRole} onResetPassword={onResetPassword} onDelete={onDelete} />
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
      <SectionCard sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>{t('rolesOverview')}</Typography>
        <Stack divider={<Divider flexItem />} spacing={2}>
          {([['ADMIN', 'roleAdminDesc'], ['INVENTORY_MANAGER', 'roleManagerDesc'], ['STAFF', 'roleStaffDesc']] as const).map(([role, desc]) => (
            <Stack key={role} spacing={0.5} alignItems="flex-start">
              <StatusChip label={roleLabel(role)} tone={ROLE_TONE[role]} />
              <Typography variant="body2" color="text.secondary">{t(desc)}</Typography>
            </Stack>
          ))}
        </Stack>
      </SectionCard>
      </Box>
    </Stack>
  );
}
