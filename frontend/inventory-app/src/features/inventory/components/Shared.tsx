'use client';

import React from 'react';
import {
  Box, Breadcrumbs, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  FormControlLabel, IconButton, Link, Menu, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import { NavigateNext as NavigateNextIcon, ViewColumn as ViewColumnIcon } from '@mui/icons-material';

// ─── Small shared pieces ─────────────────────────────────────────────────────
// Used by Settings today; the other screens can pick them up one at a time.

export interface Crumb { label: string; onClick?: () => void }

/** "Inventory / Settings": every crumb but the last is a link. */
export function Breadcrumb({ items, ariaLabel }: { items: Crumb[]; ariaLabel: string }) {
  return (
    <Breadcrumbs aria-label={ariaLabel} separator={<NavigateNextIcon sx={{ fontSize: 16 }} />} sx={{ mb: 0.5 }}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return last || !c.onClick ? (
          <Typography key={c.label} variant="caption" color={last ? 'text.primary' : 'text.secondary'} aria-current={last ? 'page' : undefined}>{c.label}</Typography>
        ) : (
          <Link key={c.label} component="button" type="button" variant="caption" underline="hover" color="text.secondary" onClick={c.onClick}>{c.label}</Link>
        );
      })}
    </Breadcrumbs>
  );
}

/** Yes/no question in a modal. `tone="error"` is for destructive actions. */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, tone = 'primary', loading, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string; cancelLabel: string;
  tone?: 'primary' | 'error'; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant="contained" color={tone} onClick={onConfirm} disabled={loading} autoFocus>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Text input with its label, help text and error message wired together. */
export function FormField({ label, value, onChange, error, help, type = 'text', disabled, required, placeholder, select, children, id }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; help?: string;
  type?: string; disabled?: boolean; required?: boolean; placeholder?: string; select?: boolean; children?: React.ReactNode; id: string;
}) {
  return (
    <TextField
      id={id} label={label} value={value} type={type} disabled={disabled} required={required} placeholder={placeholder}
      select={select} fullWidth
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)} helperText={error ?? help}
    >
      {children}
    </TextField>
  );
}

/** Row with a title and a description on the left and a control on the right (switches, selects). */
export function SettingRow({ title, description, control }: { title: string; description?: string; control: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.5, flexWrap: 'wrap' }}>
      <Box sx={{ minWidth: 0, flex: '1 1 260px' }}>
        <Typography variant="body1" fontWeight={500}>{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{control}</Box>
    </Box>
  );
}

/** Column picker: a button that opens a checklist. The caller owns the visible set. */
export function ColumnVisibilityMenu<K extends string>({ label, columns, visible, onChange }: {
  label: string; columns: Array<{ key: K; label: string; locked?: boolean }>; visible: ReadonlySet<K>; onChange: (next: Set<K>) => void;
}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={label}>
        <IconButton aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={(e) => setAnchor(e.currentTarget)}>
          <ViewColumnIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {columns.map((c) => (
          <MenuItem key={c.key} dense disableRipple sx={{ py: 0 }}>
            <FormControlLabel
              sx={{ width: '100%', m: 0 }}
              label={c.label}
              control={
                <Checkbox
                  size="small" checked={visible.has(c.key)} disabled={c.locked}
                  onChange={(e) => {
                    const next = new Set(visible);
                    if (e.target.checked) next.add(c.key); else next.delete(c.key);
                    onChange(next);
                  }}
                />
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
