'use client';

import React from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import {
  LocalShipping as LocalShippingIcon,
  LockOutlined as LockIcon,
  PersonOutline as PersonIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { LANG_NAMES, Lang, TKey } from '@/features/inventory/i18n';
import { StatusChip } from '@/features/inventory/components/Primitives';
import { LAYOUT } from '@/features/inventory/theme';

// The demo-account shortcut is only rendered when the build sets NEXT_PUBLIC_SHOW_DEMO_LOGIN=true.
// docker-compose does that for the local demo (which seeds these users); a real deployment leaves it off.
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';

const DEMO_USERS: Array<[string, string, string]> = [
  ['admin', 'admin123', 'ADMIN'],
  ['manager', 'manager123', 'INVENTORY_MANAGER'],
  ['staff', 'staff123', 'STAFF'],
];

// The picture on the left is the product's one real idea: an issue of stock leaves the OLDEST lot first,
// and its cost is the sum of what each lot actually cost. Issuing 70 units takes 40 from lot 1 and 30 from
// lot 2: 40 x 10.00 + 30 x 10.50 = 715.00.
const LOTS = [
  { id: 1, qty: 40, issued: 40, unit: '€10.00' },
  { id: 2, qty: 60, issued: 30, unit: '€10.50' },
  { id: 3, qty: 100, issued: 0, unit: '€11.20' },
] as const;
const MAX_LOT = 100;
const EXAMPLE_COST = '€715.00';

const PANEL = { bg: '#0c1a33', text: '#e8eefc', muted: '#93a4c3', line: 'rgba(147,164,195,0.24)', issued: '#60a5fa', left: '#2b3a5c' } as const;

const fill = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

function LotQueue({ t }: { t: (key: TKey) => string }) {
  return (
    <Box aria-hidden="true" sx={{ border: `1px solid ${PANEL.line}`, borderRadius: `${LAYOUT.cardRadius}px`, bgcolor: 'rgba(255,255,255,0.04)', p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: PANEL.text }}>{t('loginExampleTitle')}</Typography>
        <Typography variant="caption" sx={{ color: PANEL.muted }}>{t('loginExampleOldest')}</Typography>
      </Stack>

      <Stack spacing={1.75}>
        {LOTS.map((lot, i) => {
          const remaining = lot.qty - lot.issued;
          return (
            <Box key={lot.id}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75, fontVariantNumeric: 'tabular-nums' }}>
                <Typography variant="caption" sx={{ color: PANEL.text }}>#{lot.id} &nbsp;{lot.unit}</Typography>
                <Typography variant="caption" sx={{ color: PANEL.muted }}>{remaining} {t('loginExampleLeft')}</Typography>
              </Stack>
              <Box sx={{ width: `${(lot.qty / MAX_LOT) * 100}%`, height: 10, borderRadius: '2px', bgcolor: PANEL.left, overflow: 'hidden', display: 'flex' }}>
                {lot.issued > 0 && (
                  <Box sx={{
                    width: `${(lot.issued / lot.qty) * 100}%`, bgcolor: PANEL.issued, transformOrigin: 'left center',
                    animation: `${fill} 650ms cubic-bezier(0.22, 1, 0.36, 1) ${250 + i * 220}ms both`,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }} />
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${PANEL.line}`, fontVariantNumeric: 'tabular-nums' }}>
        <Typography variant="caption" sx={{ color: PANEL.muted }}>{t('loginExampleCost')}</Typography>
        <Typography variant="h6" component="span" sx={{ color: PANEL.text }}>{EXAMPLE_COST}</Typography>
      </Stack>
    </Box>
  );
}

function Brand({ onDark }: { onDark?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LocalShippingIcon fontSize="small" />
      </Box>
      <Typography variant="h6" component="span" sx={onDark ? { color: PANEL.text } : undefined}>Inventory</Typography>
    </Stack>
  );
}

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

/** Sign-in screen. Demo accounts exist only in the demo seed data; the shortcut is shown only when SHOW_DEMO_LOGIN is on. */
export function LoginScreen({ t, lang, onLang, form, onForm, error, onDismissError, sessionExpired, loading, onSubmit }: LoginScreenProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsOn, setCapsOn] = React.useState(false);
  const roleLabel = (r: string) => (r === 'ADMIN' ? t('roleAdmin') : r === 'STAFF' ? t('roleStaff') : t('roleInventoryManager'));

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.15fr) minmax(0, 1fr)' }, bgcolor: 'background.default' }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', bgcolor: PANEL.bg, p: { md: 6, lg: 8 } }}>
        <Brand onDark />
        <Box sx={{ maxWidth: 460 }}>
          <Typography variant="h4" component="p" sx={{ color: PANEL.text, mb: 1.5 }}>{t('loginTagline')}</Typography>
          <Typography variant="body1" sx={{ color: PANEL.muted, maxWidth: '46ch' }}>{t('loginTaglineSub')}</Typography>
        </Box>
        <Box sx={{ maxWidth: 460 }}>
          <LotQueue t={t} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', px: { xs: 2, sm: 4 }, py: 3 }}>
        <Stack direction="row" justifyContent={{ xs: 'space-between', md: 'flex-end' }} alignItems="center">
          <Box sx={{ display: { xs: 'block', md: 'none' } }}><Brand /></Box>
          <ToggleButtonGroup exclusive size="small" value={lang} aria-label={t('appearanceLanguage')}
            onChange={(_, v: Lang | null) => { if (v) onLang(v); }}
            sx={{ '& .MuiToggleButton-root': { px: 1.25, py: 0.25, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em' } }}>
            {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
              <ToggleButton key={l} value={l} aria-label={LANG_NAMES[l]}>{l.toUpperCase()}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <Box sx={{ width: '100%', maxWidth: 400, minWidth: 0 }}>
            <Typography variant="h5" component="h1">{t('login')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 3.5 }}>{t('loginSubtitle')}</Typography>

            {sessionExpired && !error && <Alert severity="info" sx={{ mb: 2 }}>{t('sessionExpired')}</Alert>}
            {error && <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={onSubmit} noValidate={false}>
              <Stack spacing={2.5}>
                <TextField label={t('username')} value={form.username} onChange={(e) => onForm({ ...form, username: e.target.value })}
                  fullWidth required autoComplete="username" autoFocus
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }} />
                <TextField label={t('password')} type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={(e) => onForm({ ...form, password: e.target.value })}
                  onKeyUp={(e) => setCapsOn(e.getModifierState('CapsLock'))}
                  onKeyDown={(e) => setCapsOn(e.getModifierState('CapsLock'))}
                  onBlur={() => setCapsOn(false)}
                  helperText={capsOn ? t('loginCapsLock') : undefined}
                  fullWidth required autoComplete="current-password"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" edge="end" onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? t('loginHidePassword') : t('loginShowPassword')}>
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }} />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.25, fontWeight: 600, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                  {loading ? t('signingIn') : t('login')}
                </Button>
              </Stack>
            </Box>

            {SHOW_DEMO_LOGIN && (
              <Box sx={{ mt: 4, border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden', bgcolor: 'background.paper' }}>
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" component="div">{t('demoCredentials')}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('loginDemoHint')}</Typography>
                </Box>
                {DEMO_USERS.map(([u, p, r], i) => (
                  <Box key={u} component="button" type="button" onClick={() => onForm({ username: u, password: p })}
                    sx={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, cursor: 'pointer', color: 'text.primary',
                      borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                      {u.charAt(0).toUpperCase()}
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 0, flex: 1 }}>
                      {u}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{p}</Typography>
                    </Typography>
                    <StatusChip label={roleLabel(r)} tone={r === 'ADMIN' ? 'primary' : 'neutral'} />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
