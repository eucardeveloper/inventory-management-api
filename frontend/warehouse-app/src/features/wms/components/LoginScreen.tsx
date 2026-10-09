'use client';

import React from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { LocalShipping as LocalShippingIcon } from '@mui/icons-material';
import { LANG_FLAGS, Lang, TKey } from '@/features/wms/i18n';
import { BRAND } from '@/features/wms/theme';
import { StatusChip } from '@/features/wms/components/Primitives';

const DEMO_USERS: Array<[string, string, string]> = [
  ['admin', 'admin123', 'ADMIN'],
  ['warehouse', 'warehouse123', 'WAREHOUSE_MANAGER'],
  ['staff', 'staff123', 'STAFF'],
];

interface LoginScreenProps {
  t: (key: TKey) => string;
  lang: Lang;
  onLang: (l: Lang) => void;
  form: { username: string; password: string };
  onForm: (f: { username: string; password: string }) => void;
  error: string;
  onDismissError: () => void;
  sessionExpired: boolean;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Sign-in screen. Demo accounts exist only in the demo seed data; they are shown to make the portfolio easy to try. */
export function LoginScreen({ t, lang, onLang, form, onForm, error, onDismissError, sessionExpired, loading, onSubmit }: LoginScreenProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 420, minWidth: 0 }}>
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '12px', bgcolor: BRAND.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalShippingIcon />
          </Box>
          <Typography variant="h5" textAlign="center">{t('appTitle')}</Typography>
        </Stack>

        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: { xs: 2.5, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Typography variant="h6">{t('login')}</Typography>

            {sessionExpired && !error && <Alert severity="info">{t('sessionExpired')}</Alert>}
            {error && <Alert severity="error" onClose={onDismissError}>{error}</Alert>}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField label={t('username')} value={form.username} onChange={(e) => onForm({ ...form, username: e.target.value })}
                  fullWidth required autoComplete="username" autoFocus />
                <TextField label={t('password')} type="password" value={form.password} onChange={(e) => onForm({ ...form, password: e.target.value })}
                  fullWidth required autoComplete="current-password" />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}>
                  {loading ? t('signingIn') : t('login')}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                {t('demoCredentials')}
              </Typography>
              <Stack spacing={0.5}>
                {DEMO_USERS.map(([u, p, r]) => (
                  <Box key={u} component="button" type="button" onClick={() => onForm({ username: u, password: p })}
                    sx={{ all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: '6px', cursor: 'pointer', color: 'text.primary',
                      '&:hover, &:focus-visible': { bgcolor: 'action.hover' } }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 0 }} noWrap>{u} / {p}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <StatusChip label={r === 'ADMIN' ? t('roleAdmin') : r === 'STAFF' ? t('roleStaff') : t('roleWarehouseManager')} tone={r === 'ADMIN' ? 'primary' : r === 'STAFF' ? 'neutral' : 'info'} />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2 }}>
          {(Object.keys(LANG_FLAGS) as Lang[]).map((l) => (
            <StatusChip key={l} label={`${LANG_FLAGS[l]} ${l.toUpperCase()}`} tone={lang === l ? 'primary' : 'neutral'} onClick={() => onLang(l)} />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
