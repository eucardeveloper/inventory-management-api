/**
 * Dialogs of the product catalogue: create / edit a product and confirm deactivating it.
 * They only render and report input; the state and the API calls stay in InventoryApp.
 */

import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import type { TKey } from '@/features/inventory/i18n';
import type { Permissions } from '@/features/inventory/permissions';
import type { Product, Supplier } from '@/hooks/useInventoryQueries';

type Props = {
  t: (key: TKey) => string;
  perms: Permissions;
  suppliers: Supplier[];
  formError: string;
  onDismissError: () => void;
  onClose: () => void;
  product: { state: Partial<Product> | null; set: React.Dispatch<React.SetStateAction<Partial<Product> | null>>; pending: boolean; onSave: () => void };
  deactivate: { state: Product | null; pending: boolean; onConfirm: () => void };
};

export function ProductDialogs({ t, perms, suppliers, formError, onDismissError, onClose, product, deactivate }: Props) {
  const FormErrorAlert = formError ? <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>{formError}</Alert> : null;
  return (
    <>
        {/* Product create / edit */}
        <Dialog open={Boolean(product.state)} onClose={onClose} maxWidth="sm" fullWidth>
          <DialogTitle>{product.state?.id ? t('editProduct') : t('addProduct')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <TextField label={t('name')} value={product.state?.name ?? ''} onChange={(e) => product.set((d) => ({ ...d, name: e.target.value }))} fullWidth required />
              <TextField label={t('articleNumber')} value={product.state?.articleNumber ?? ''} onChange={(e) => product.set((d) => ({ ...d, articleNumber: e.target.value }))} fullWidth required />
              <TextField label={t('description')} value={product.state?.description ?? ''} onChange={(e) => product.set((d) => ({ ...d, description: e.target.value }))} fullWidth multiline rows={2} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {perms.canSeeFinancials && (
                  <TextField label={t('unitPrice')} type="number" value={product.state?.unitPrice ?? ''}
                    onChange={(e) => product.set((d) => ({ ...d, unitPrice: e.target.value ? Number(e.target.value) : undefined }))} fullWidth inputProps={{ min: 0, step: '0.01' }} />
                )}
                <TextField label={t('reorderLevel')} type="number" value={product.state?.reorderLevel ?? ''}
                  onChange={(e) => product.set((d) => ({ ...d, reorderLevel: e.target.value ? Number(e.target.value) : undefined }))} fullWidth inputProps={{ min: 0 }} />
              </Stack>
              <FormControl fullWidth>
                <InputLabel id="product-supplier-label">{t('supplier_optional')}</InputLabel>
                <Select labelId="product-supplier-label" label={t('supplier_optional')} value={product.state?.supplier?.id ?? ''}
                  onChange={(e) => {
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    product.set((d) => ({ ...d, supplier: sup ?? null }));
                  }}>
                  <MenuItem value="">—</MenuItem>
                  {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.companyName}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" onClick={product.onSave} disabled={product.pending}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Deactivate product */}
        <Dialog open={Boolean(deactivate.state)} onClose={onClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('deactivateConfirm')}</DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Typography fontWeight={600}>{deactivate.state?.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('deactivateWarning')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" color="error" onClick={deactivate.onConfirm} disabled={deactivate.pending}>{t('deactivate')}</Button>
          </DialogActions>
        </Dialog>

    </>
  );
}
