/**
 * Dialogs of the stock ledger: book a movement (stock in / out) and reverse one.
 * They only render and report input; the state and the API calls stay in InventoryApp.
 */

import React from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { Undo as UndoIcon } from '@mui/icons-material';
import type { Lang, TKey } from '@/features/inventory/i18n';
import { StatusChip } from '@/features/inventory/components/Primitives';
import { formatDateTime } from '@/features/inventory/dates';
import type { Product, StockMovement } from '@/hooks/useInventoryQueries';

export type MovementForm = { productId: number | ''; movementType: 'IN' | 'OUT'; quantity: number | ''; unitCost: number | '' };

type Props = {
  t: (key: TKey) => string;
  lang: Lang;
  products: Product[];
  formError: string;
  onDismissError: () => void;
  onClose: () => void;
  book: { open: boolean; form: MovementForm; setForm: React.Dispatch<React.SetStateAction<MovementForm>>; pending: boolean; onSave: () => void };
  reverse: { state: StockMovement | null; reasonCode: string; setReasonCode: (v: string) => void; pending: boolean; onConfirm: () => void };
};

export function MovementDialogs({ t, lang, products, formError, onDismissError, onClose, book, reverse }: Props) {
  const FormErrorAlert = formError ? <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>{formError}</Alert> : null;
  const selectedProductForMovement = products.find((p) => p.id === Number(book.form.productId));
  const movementQty = Number(book.form.quantity) || 0;
  const movementIsOut = book.form.movementType === 'OUT';
  const movementInsufficient = !!selectedProductForMovement && movementIsOut && movementQty > selectedProductForMovement.stock;
  return (
    <>
        {/* Book stock movement (every role) */}
        <Dialog open={book.open} onClose={onClose} maxWidth="sm" fullWidth>
          <DialogTitle>{t('recordMovement')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <FormControl fullWidth required>
                <InputLabel id="movement-product-label">{t('product')}</InputLabel>
                <Select labelId="movement-product-label" label={t('product')} value={book.form.productId} onChange={(e) => book.setForm((f) => ({ ...f, productId: e.target.value as number | '' }))}>
                  {products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({p.articleNumber})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="movement-type-label">{t('type')}</InputLabel>
                <Select labelId="movement-type-label" label={t('type')} value={book.form.movementType} onChange={(e) => book.setForm((f) => ({ ...f, movementType: e.target.value as 'IN' | 'OUT' }))}>
                  <MenuItem value="IN">{t('stockIn')}</MenuItem>
                  <MenuItem value="OUT">{t('stockOut')}</MenuItem>
                </Select>
              </FormControl>
              <TextField label={t('quantity')} type="number" value={book.form.quantity}
                onChange={(e) => book.setForm((f) => ({ ...f, quantity: e.target.value ? Number(e.target.value) : '' }))} fullWidth required inputProps={{ min: 1 }} />
              {/* The API needs a unit cost for every stock-in (it creates the FIFO lot), whatever the role.
                  STAFF may enter it but never sees costs afterwards. */}
              {!movementIsOut && (
                <TextField label={t('unitCost')} type="number" value={book.form.unitCost} required helperText={t('unitCostHelp')}
                  onChange={(e) => book.setForm((f) => ({ ...f, unitCost: e.target.value ? Number(e.target.value) : '' }))} fullWidth inputProps={{ min: 0, step: '0.01' }} />
              )}
              {selectedProductForMovement && (
                <Box sx={{ p: 2, borderRadius: '8px', border: '1px solid', borderColor: movementInsufficient ? 'error.main' : 'divider', bgcolor: 'background.default' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('currentStockLevel')}</Typography>
                    <StatusChip label={selectedProductForMovement.stock} tone={selectedProductForMovement.stock === 0 ? 'error' : selectedProductForMovement.reorderLevel != null && selectedProductForMovement.stock <= selectedProductForMovement.reorderLevel ? 'warning' : 'success'} />
                  </Stack>
                  {movementQty > 0 && (
                    <Typography variant="caption" color={movementInsufficient ? 'error.main' : 'text.secondary'} fontWeight={movementInsufficient ? 600 : 400} component="div" sx={{ mt: 0.5 }}>
                      {t('stockAfterMovement')}: {selectedProductForMovement.stock} → {movementIsOut ? selectedProductForMovement.stock - movementQty : selectedProductForMovement.stock + movementQty}
                      {movementInsufficient ? ` · ${t('insufficientStock')}` : ''}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" onClick={book.onSave}
              disabled={book.pending || !book.form.productId || !book.form.quantity || movementInsufficient}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Reverse movement (ADMIN / INVENTORY_MANAGER) */}
        <Dialog open={Boolean(reverse.state)} onClose={onClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}><UndoIcon color="warning" /><span>{t('reverseMovement')}</span></Stack>
          </DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Alert severity="warning" sx={{ mb: 2 }}>{t('reverseConfirm')} {t('reverseWarning')}</Alert>
            {reverse.state && (
              <Box sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2"><strong>{t('product')}:</strong> {reverse.state.productName}</Typography>
                  <Typography variant="body2"><strong>{t('type')}:</strong> {reverse.state.movementType === 'IN' ? t('stockIn') : t('stockOut')}</Typography>
                  <Typography variant="body2"><strong>{t('quantity')}:</strong> {reverse.state.quantity}</Typography>
                  <Typography variant="body2"><strong>{t('date')}:</strong> {formatDateTime(reverse.state.occurredAt, lang)}</Typography>
                </Stack>
              </Box>
            )}
            <TextField label={t('reasonCode')} value={reverse.reasonCode} onChange={(e) => { reverse.setReasonCode(e.target.value); onDismissError(); }}
              fullWidth required helperText={t('reasonCodeHint')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="contained" color="warning" onClick={reverse.onConfirm} disabled={reverse.pending} startIcon={<UndoIcon />}>{t('confirm')}</Button>
          </DialogActions>
        </Dialog>

    </>
  );
}
