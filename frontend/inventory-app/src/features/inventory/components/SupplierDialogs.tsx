/**
 * Dialogs of the supplier list: create / edit a supplier and confirm deleting one (ADMIN).
 * They only render and report input; the state and the API calls stay in InventoryApp.
 */

import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import type { TKey } from '@/features/inventory/i18n';
import type { Supplier } from '@/hooks/useInventoryQueries';

type Props = {
  t: (key: TKey) => string;
  formError: string;
  onDismissError: () => void;
  onClose: () => void;
  supplier: { state: Partial<Supplier> | null; set: React.Dispatch<React.SetStateAction<Partial<Supplier> | null>>; pending: boolean; onSave: () => void };
  remove: { state: Supplier | null; pending: boolean; onConfirm: () => void };
};

export function SupplierDialogs({ t, formError, onDismissError, onClose, supplier, remove }: Props) {
  const FormErrorAlert = formError ? <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>{formError}</Alert> : null;
  return (
    <>
        {/* Supplier create / edit */}
        <Dialog open={Boolean(supplier.state)} onClose={onClose} maxWidth="sm" fullWidth>
          <DialogTitle>{supplier.state?.id ? t('editSupplier') : t('addSupplier')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <TextField label={t('companyName')} value={supplier.state?.companyName ?? ''} onChange={(e) => supplier.set((d) => ({ ...d, companyName: e.target.value }))} fullWidth required />
              <TextField label={t('contactPerson')} value={supplier.state?.contactPerson ?? ''} onChange={(e) => supplier.set((d) => ({ ...d, contactPerson: e.target.value }))} fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('email')} type="email" value={supplier.state?.email ?? ''} onChange={(e) => supplier.set((d) => ({ ...d, email: e.target.value }))} fullWidth required />
                <TextField label={t('phone')} value={supplier.state?.phone ?? ''} onChange={(e) => supplier.set((d) => ({ ...d, phone: e.target.value }))} fullWidth />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" onClick={supplier.onSave} disabled={supplier.pending}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Delete supplier (ADMIN only) */}
        <Dialog open={Boolean(remove.state)} onClose={onClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('delete')}</DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Typography>{t('deleteConfirm')} <strong>{remove.state?.companyName}</strong>?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" color="error" onClick={remove.onConfirm} disabled={remove.pending}>{t('delete')}</Button>
          </DialogActions>
        </Dialog>

    </>
  );
}
