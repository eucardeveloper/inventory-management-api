'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, MenuItem, Skeleton, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Check as CheckIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { LANG_NAMES, Lang, TKey } from '@/features/wms/i18n';
import { PERMISSIONS, Permissions, WmsRole } from '@/features/wms/permissions';
import { formatCurrency } from '@/features/wms/format';
import {
  DEFAULT_STORED, NAME_MAX, TIMEZONES, cleanDraft, isDirty, loadStored, saveStored, validateDraft,
  type AppearanceSettings, type KeyValueStore, type SettingsDraft, type SettingsErrors, type StoredSettings, type ThemeChoice,
} from '@/features/wms/settings';
import { Breadcrumb, ConfirmDialog, FormField, SettingRow } from '@/features/wms/components/Shared';
import { PageHeader, SectionCard, StatusChip } from '@/features/wms/components/Primitives';

type TabId = 'workspace' | 'notifications' | 'currency' | 'appearance' | 'permissions';
const TABS: TabId[] = ['workspace', 'notifications', 'currency', 'appearance', 'permissions'];

// localStorage can be missing or throw (private mode, blocked site data), so every access goes through here.
function browserStore(): KeyValueStore | undefined {
  try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; }
}

const ROLES: WmsRole[] = ['ADMIN', 'WAREHOUSE_MANAGER', 'STAFF'];
const CAPABILITIES: Array<{ key: keyof Permissions; label: TKey }> = [
  { key: 'canBookMovements', label: 'permBook' },
  { key: 'canReverseMovements', label: 'permReverse' },
  { key: 'canEditProducts', label: 'permEditProducts' },
  { key: 'canEditSuppliers', label: 'permEditSuppliers' },
  { key: 'canDeleteSuppliers', label: 'permDeleteSuppliers' },
  { key: 'canSeeFinancials', label: 'permFinancials' },
  { key: 'canSeeAudit', label: 'permAudit' },
  { key: 'canManageUsers', label: 'permUsers' },
];

interface SettingsViewProps {
  t: (key: TKey) => string;
  lang: Lang;
  perms: Permissions;
  isDark: boolean;
  /** Applies theme and language to the app shell (both have their own storage keys). */
  onApplyAppearance: (a: AppearanceSettings) => void;
  onNotify: (message: string, severity: 'success' | 'error') => void;
  /** Lets the shell warn before navigating away from unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
  onHome: () => void;
}

export function SettingsView({ t, lang, perms, isDark, onApplyAppearance, onNotify, onDirtyChange, onHome }: SettingsViewProps) {
  const [tab, setTab] = useState<TabId>('workspace');
  const [loaded, setLoaded] = useState(false);
  const [stored, setStored] = useState<StoredSettings>(DEFAULT_STORED);
  const [draft, setDraft] = useState<SettingsDraft>({ ...DEFAULT_STORED, appearance: { theme: isDark ? 'dark' : 'light', lang } });
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Browser storage only exists after hydration, so the stored values are read in an effect.
  useEffect(() => {
    const s = loadStored(browserStore());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after hydration; reading it during render would cause a server/client mismatch
    setStored(s);
    setDraft({ ...s, appearance: { theme: isDark ? 'dark' : 'light', lang } });
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only; later theme/language changes come from this form
  }, []);

  // The baseline is what is saved: stored values plus whatever theme and language the app is using right now.
  const baseline: SettingsDraft = useMemo(
    () => ({ ...stored, appearance: { theme: isDark ? 'dark' : 'light', lang } }),
    [stored, isDark, lang],
  );
  const dirty = loaded && isDirty(draft, baseline);

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setWorkspace = (patch: Partial<SettingsDraft['workspace']>) => setDraft((d) => ({ ...d, workspace: { ...d.workspace, ...patch } }));
  const setNotifications = (patch: Partial<SettingsDraft['notifications']>) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, ...patch } }));
  const setAppearance = (patch: Partial<AppearanceSettings>) => setDraft((d) => ({ ...d, appearance: { ...d.appearance, ...patch } }));

  const discard = () => {
    setDraft(baseline);
    setErrors({});
    setSaveError('');
    setConfirmDiscard(false);
  };

  const save = async () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setTab(found.name || found.contactEmail ? 'workspace' : 'notifications');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const clean = cleanDraft(draft);
      // Storage is synchronous; the short pause keeps the "Saving" state visible and blocks double clicks.
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveStored(browserStore(), { workspace: clean.workspace, notifications: clean.notifications });
      setStored({ workspace: clean.workspace, notifications: clean.notifications });
      setDraft(clean);
      if (clean.appearance.theme !== baseline.appearance.theme || clean.appearance.lang !== baseline.appearance.lang) {
        onApplyAppearance(clean.appearance);
      }
      onNotify(t('settingsSaved'), 'success');
    } catch {
      setSaveError(t('settingsSaveFailed'));
      onNotify(t('settingsSaveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabLabel: Record<TabId, string> = {
    workspace: t('tabWorkspace'), notifications: t('tabNotifications'), currency: t('tabCurrency'),
    appearance: t('tabAppearance'), permissions: t('tabPermissions'),
  };
  const err = (key: keyof SettingsErrors) => (errors[key] ? t(errors[key] as TKey) : undefined);
  const roleLabel = (r: WmsRole) => (r === 'ADMIN' ? t('roleAdmin') : r === 'WAREHOUSE_MANAGER' ? t('roleWarehouseManager') : t('roleStaff'));
  const canEditWorkspace = perms.canEditWorkspaceSettings;
  const showFooter = tab !== 'permissions' && tab !== 'currency';

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Box>
        <Breadcrumb ariaLabel="breadcrumb" items={[{ label: t('appTitle'), onClick: onHome }, { label: t('settings') }]} />
        <PageHeader title={t('settings')} subtitle={t('settingsSubtitle')} />
      </Box>

      <Alert severity="info" variant="outlined" sx={{ alignItems: 'center' }}>{t('settingsLocalNote')}</Alert>

      <SectionCard>
        <Tabs
          value={tab} onChange={(_, v: TabId) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
          aria-label={t('settings')} sx={{ px: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {TABS.map((id) => (
            <Tab key={id} value={id} label={tabLabel[id]} id={`settings-tab-${id}`} aria-controls={`settings-panel-${id}`} />
          ))}
        </Tabs>

        <Box role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`} sx={{ p: { xs: 2, md: 3 } }}>
          {!loaded ? (
            <Stack spacing={2} sx={{ maxWidth: 560 }} aria-busy="true">
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={56} />
            </Stack>
          ) : tab === 'workspace' ? (
            <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
              {!canEditWorkspace && <Alert severity="info">{t('settingsAdminOnly')}</Alert>}
              <FormField
                id="ws-name" label={t('workspaceName')} value={draft.workspace.name} required disabled={!canEditWorkspace}
                onChange={(v) => setWorkspace({ name: v })} error={err('name')} help={`${draft.workspace.name.trim().length}/${NAME_MAX}`}
              />
              <FormField
                id="ws-email" label={t('contactEmail')} type="email" value={draft.workspace.contactEmail} disabled={!canEditWorkspace}
                onChange={(v) => setWorkspace({ contactEmail: v })} error={err('contactEmail')}
              />
              <FormField
                id="ws-tz" label={t('timezone')} select value={draft.workspace.timezone} disabled={!canEditWorkspace}
                onChange={(v) => setWorkspace({ timezone: v })}
              >
                {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </FormField>
            </Stack>
          ) : tab === 'notifications' ? (
            <Stack sx={{ maxWidth: 640 }} divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
              <SettingRow
                title={t('notifLowStock')} description={t('notifLowStockHelp')}
                control={<Switch checked={draft.notifications.lowStock} onChange={(e) => setNotifications({ lowStock: e.target.checked })} inputProps={{ 'aria-label': t('notifLowStock') }} />}
              />
              <SettingRow
                title={t('notifDigest')} description={t('notifDigestHelp')}
                control={<Switch checked={draft.notifications.digest} onChange={(e) => setNotifications({ digest: e.target.checked })} inputProps={{ 'aria-label': t('notifDigest') }} />}
              />
              {draft.notifications.digest && (
                <Stack spacing={2.5} sx={{ py: 2 }}>
                  <FormField
                    id="digest-freq" label={t('digestFrequency')} select value={draft.notifications.digestFrequency}
                    onChange={(v) => setNotifications({ digestFrequency: v === 'daily' ? 'daily' : 'weekly' })}
                  >
                    <MenuItem value="daily">{t('freqDaily')}</MenuItem>
                    <MenuItem value="weekly">{t('freqWeekly')}</MenuItem>
                  </FormField>
                  <FormField
                    id="digest-email" label={t('digestEmail')} type="email" value={draft.notifications.digestEmail} required
                    onChange={(v) => setNotifications({ digestEmail: v })} error={err('digestEmail')}
                  />
                </Stack>
              )}
            </Stack>
          ) : tab === 'currency' ? (
            <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
              <FormField id="cur-base" label={t('currencyBase')} value="EUR" disabled help={t('currencyBaseHelp')} onChange={() => undefined} />
              <FormField id="cur-val" label={t('valuationMethod')} value={t('valuationFifo')} disabled onChange={() => undefined} />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('currencyPreview')}</Typography>
                <Stack spacing={0.5}>
                  {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
                    <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">{LANG_NAMES[l]}</Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(1234.5, l)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          ) : tab === 'appearance' ? (
            <Stack spacing={3} sx={{ maxWidth: 560 }}>
              <Box>
                <Typography variant="subtitle2" id="theme-label" sx={{ mb: 1 }}>{t('appearanceTheme')}</Typography>
                <ToggleButtonGroup
                  exclusive size="small" value={draft.appearance.theme} aria-labelledby="theme-label"
                  onChange={(_, v: ThemeChoice | null) => { if (v) setAppearance({ theme: v }); }}
                >
                  <ToggleButton value="light">{t('themeLight')}</ToggleButton>
                  <ToggleButton value="dark">{t('themeDark')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormField
                id="app-lang" label={t('appearanceLanguage')} select value={draft.appearance.lang}
                onChange={(v) => { if (v in LANG_NAMES) setAppearance({ lang: v as Lang }); }}
              >
                {(Object.keys(LANG_NAMES) as Lang[]).map((l) => <MenuItem key={l} value={l}>{LANG_NAMES[l]}</MenuItem>)}
              </FormField>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>{t('permissionsIntro')}</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('permCapability')}</TableCell>
                      {ROLES.map((r) => <TableCell key={r} align="center">{roleLabel(r)}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {CAPABILITIES.map((c) => (
                      <TableRow key={c.key}>
                        <TableCell>{t(c.label)}</TableCell>
                        {ROLES.map((r) => {
                          const allowed = PERMISSIONS[r][c.key];
                          return (
                            <TableCell key={r} align="center">
                              {allowed
                                ? <CheckIcon fontSize="small" color="success" titleAccess={t('permAllowed')} />
                                : <RemoveIcon fontSize="small" color="disabled" titleAccess={t('permNotAllowed')} />}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </Box>

        {showFooter && loaded && (
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5,
              px: { xs: 2, md: 3 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider',
            }}
          >
            <Box role="status" aria-live="polite" sx={{ minWidth: 0 }}>
              {saveError ? (
                <Typography variant="body2" color="error.main">{saveError}</Typography>
              ) : dirty ? (
                <StatusChip label={t('settingsUnsaved')} tone="warning" />
              ) : null}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setConfirmDiscard(true)} disabled={!dirty || saving}>{t('settingsDiscard')}</Button>
              <Button
                variant="contained" onClick={save} disabled={!dirty || saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {saving ? t('settingsSaving') : t('settingsSave')}
              </Button>
            </Stack>
          </Box>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmDiscard} title={t('discardTitle')} message={t('discardMessage')}
        confirmLabel={t('discardConfirm')} cancelLabel={t('keepEditing')} tone="error"
        onConfirm={discard} onCancel={() => setConfirmDiscard(false)}
      />
    </Stack>
  );
}
