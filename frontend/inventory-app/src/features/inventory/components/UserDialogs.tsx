/**
 * Dialogs of the user administration: add a user, change a role, set a password (own or someone else's),
 * delete a user. They only render and report input; the state and the API calls stay in InventoryApp.
 */

import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import type { TKey } from '@/features/inventory/i18n';
import type { UserRecord } from '@/hooks/useInventoryQueries';

export type AddUserState = { username: string; password: string; confirm: string; role: string };
export type ChangeRoleState = { user: UserRecord; role: string };
export type PasswordForm = { current: string; next: string; confirm: string };

type Props = {
  t: (key: TKey) => string;
  formError: string;
  onDismissError: () => void;
  onClose: () => void;
  addUser: { state: AddUserState | null; set: React.Dispatch<React.SetStateAction<AddUserState | null>>; pending: boolean; onSubmit: () => void };
  changeRole: { state: ChangeRoleState | null; set: React.Dispatch<React.SetStateAction<ChangeRoleState | null>>; pending: boolean; onSubmit: () => void };
  password: {
    ownOpen: boolean; resetUser: UserRecord | null; form: PasswordForm;
    setForm: React.Dispatch<React.SetStateAction<PasswordForm>>; invalid: boolean; pending: boolean; onSubmit: () => void;
  };
  deleteUser: { state: UserRecord | null; pending: boolean; onSubmit: () => void };
};

export function UserDialogs({ t, formError, onDismissError, onClose, addUser, changeRole, password, deleteUser }: Props) {
  const FormErrorAlert = formError ? <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>{formError}</Alert> : null;
  return (
    <>
        {/* Add user (ADMIN) */}
        <Dialog open={Boolean(addUser.state)} onClose={onClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('addUser')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <TextField label={t('username')} autoComplete="off" value={addUser.state?.username ?? ''} helperText={t('usernameRule')}
                onChange={(e) => addUser.set((d) => (d ? { ...d, username: e.target.value } : d))} fullWidth required autoFocus />
              <TextField label={t('password')} type="password" autoComplete="new-password" value={addUser.state?.password ?? ''} helperText={t('minPasswordLength')}
                onChange={(e) => addUser.set((d) => (d ? { ...d, password: e.target.value } : d))} fullWidth required />
              <TextField label={t('confirmPassword')} type="password" autoComplete="new-password" value={addUser.state?.confirm ?? ''}
                error={Boolean(addUser.state?.confirm) && addUser.state?.confirm !== addUser.state?.password}
                helperText={Boolean(addUser.state?.confirm) && addUser.state?.confirm !== addUser.state?.password ? t('passwordMismatch') : ' '}
                onChange={(e) => addUser.set((d) => (d ? { ...d, confirm: e.target.value } : d))} fullWidth required />
              <FormControl fullWidth>
                <InputLabel id="add-user-role-label">{t('role')}</InputLabel>
                <Select labelId="add-user-role-label" label={t('role')} value={addUser.state?.role ?? 'STAFF'} onChange={(e) => addUser.set((d) => (d ? { ...d, role: e.target.value } : d))}>
                  <MenuItem value="ADMIN">{t('roleAdmin')}</MenuItem>
                  <MenuItem value="INVENTORY_MANAGER">{t('roleInventoryManager')}</MenuItem>
                  <MenuItem value="STAFF">{t('roleStaff')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained"
              disabled={addUser.pending || !addUser.state || addUser.state.username.trim().length < 3 || addUser.state.password.length < 8 || addUser.state.password !== addUser.state.confirm}
              onClick={addUser.onSubmit}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Change role (ADMIN) */}
        <Dialog open={Boolean(changeRole.state)} onClose={onClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('changeRole')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              {changeRole.state && <Typography variant="body2" color="text.secondary"><strong>{changeRole.state.user.username}</strong></Typography>}
              <FormControl fullWidth>
                <InputLabel id="change-role-label">{t('role')}</InputLabel>
                <Select labelId="change-role-label" label={t('role')} value={changeRole.state?.role ?? ''} onChange={(e) => changeRole.set((d) => (d ? { ...d, role: e.target.value } : d))}>
                  <MenuItem value="ADMIN">{t('roleAdmin')}</MenuItem>
                  <MenuItem value="INVENTORY_MANAGER">{t('roleInventoryManager')}</MenuItem>
                  <MenuItem value="STAFF">{t('roleStaff')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" disabled={changeRole.pending} onClick={changeRole.onSubmit}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Password: own (every role, current password required) or reset of another user (ADMIN) */}
        <Dialog open={password.ownOpen || Boolean(password.resetUser)} onClose={onClose} maxWidth="xs" fullWidth>
          <DialogTitle>{password.ownOpen ? t('changeMyPassword') : t('changePassword')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              {password.resetUser && <Typography variant="body2" color="text.secondary"><strong>{password.resetUser.username}</strong></Typography>}
              {password.ownOpen && (
                <TextField label={t('currentPassword')} type="password" autoComplete="current-password" value={password.form.current}
                  onChange={(e) => password.setForm((f) => ({ ...f, current: e.target.value }))} fullWidth required />
              )}
              <TextField label={t('newPassword')} type="password" autoComplete="new-password" value={password.form.next} helperText={t('minPasswordLength')}
                onChange={(e) => password.setForm((f) => ({ ...f, next: e.target.value }))} fullWidth required />
              <TextField label={t('confirmPassword')} type="password" autoComplete="new-password" value={password.form.confirm}
                error={password.form.confirm !== '' && password.form.confirm !== password.form.next} helperText={password.form.confirm !== '' && password.form.confirm !== password.form.next ? t('passwordMismatch') : ' '}
                onChange={(e) => password.setForm((f) => ({ ...f, confirm: e.target.value }))} fullWidth required />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" onClick={password.onSubmit}
              disabled={password.pending || password.invalid || (password.ownOpen && !password.form.current) || password.form.next !== password.form.confirm}>
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete user (ADMIN) */}
        <Dialog open={Boolean(deleteUser.state)} onClose={onClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('deleteUser')}</DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Alert severity="error" sx={{ mb: 1 }}>{t('deleteUserConfirm')}</Alert>
            <Typography fontWeight={600}>{deleteUser.state?.username}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" color="error" disabled={deleteUser.pending} onClick={deleteUser.onSubmit}>{t('delete')}</Button>
          </DialogActions>
        </Dialog>

    </>
  );
}
