'use client';

import React from 'react';
import { Avatar, Box, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, People as PeopleIcon, SwapVert as SwapVertIcon } from '@mui/icons-material';
import { type UserRecord } from '@/hooks/useWmsQueries';
import { type UseQueryResult } from '@tanstack/react-query';
import { TKey } from '@/features/wms/i18n';
import { WmsRole } from '@/features/wms/permissions';
import { EmptyState, SkeletonRows } from '@/features/wms/components/Primitives';

interface UsersViewProps {
  t: (key: TKey) => string;
  usersQ: UseQueryResult<UserRecord[], Error>;
  auth: { username: string; role: WmsRole; };
  setChangeRoleDialog: React.Dispatch<React.SetStateAction<{ user: UserRecord; role: string; } | null>>;
  setChangePasswordDialog: React.Dispatch<React.SetStateAction<UserRecord | null>>;
  setPwForm: React.Dispatch<React.SetStateAction<{ currentPassword: string; newPassword: string; }>>;
  setDeleteUserDialog: React.Dispatch<React.SetStateAction<UserRecord | null>>;
}

export function UsersView({ t, usersQ, auth, setChangeRoleDialog, setChangePasswordDialog, setPwForm, setDeleteUserDialog }: UsersViewProps) {
  return (
(
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('userManagement')}
                  </Typography>
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${(usersQ.data ?? []).length} ${t('user')}${(usersQ.data ?? []).length !== 1 ? 's' : ''}`}
                    variant="outlined"
                    color="primary"
                  />
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>ID</TableCell>
                        <TableCell>{t('username')}</TableCell>
                        <TableCell>{t('role')}</TableCell>
                        <TableCell align="center">{t('actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usersQ.isLoading ? (
                        <SkeletonRows cols={4} />
                      ) : (usersQ.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<PeopleIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noUsers')}
                              message={t('noUsersMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (usersQ.data ?? []).map((u) => (
                          <TableRow key={u.id} hover>
                            <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem', fontFamily: 'monospace' }}>{u.id}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: u.role === 'ADMIN' ? 'error.main' : u.role === 'WAREHOUSE_MANAGER' ? 'primary.main' : 'grey.500' }}>
                                  {u.username.slice(0, 2).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" fontWeight={600}>{u.username}</Typography>
                                {u.username === auth?.username && (
                                  <Chip size="small" label={t('youAreHere')} color="primary" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={u.role === 'ADMIN' ? t('roleAdmin') : u.role === 'WAREHOUSE_MANAGER' ? t('roleWarehouseManager') : t('roleStaff')}
                                color={u.role === 'ADMIN' ? 'error' : u.role === 'WAREHOUSE_MANAGER' ? 'primary' : 'default'}
                                variant={u.role === 'ADMIN' ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title={t('changeRole')}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => setChangeRoleDialog({ user: u, role: u.role })}
                                  >
                                    <SwapVertIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('changePassword')}>
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => { setChangePasswordDialog(u); setPwForm({ currentPassword: '', newPassword: '' }); }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('deleteUser')}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => setDeleteUserDialog(u)}
                                      disabled={u.username === auth?.username}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </TableCell>
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
