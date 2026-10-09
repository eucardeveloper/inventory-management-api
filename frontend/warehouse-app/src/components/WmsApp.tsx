'use client';

/**
 * Inventory app shell: auth, routing, theme/i18n state, the page views and the dialogs.
 * Shared pieces live in src/features/wms (i18n, permissions, theme, components, exporters).
 * The UI hides what a role cannot do (see permissions.ts); the API enforces it.
 */

import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, AppBar, Box, Button, CircularProgress, CssBaseline, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, IconButton, InputLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Select, Snackbar, Stack, TextField, ThemeProvider, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { Assessment as AssessmentIcon, Assignment as AssignmentIcon, Business as BusinessIcon, Dashboard as DashboardIcon, DarkMode as DarkModeIcon, Inventory as InventoryIcon, Language as LanguageIcon, LightMode as LightModeIcon, LocalShipping as LocalShippingIcon, Logout as LogoutIcon, Menu as MenuIcon, People as PeopleIcon, Search as SearchIcon, SwapVert as SwapVertIcon, Undo as UndoIcon, LockReset as LockResetIcon, Warning as WarningIcon } from '@mui/icons-material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useMovements, useRecordMovement, useReverseMovement, useStockReport, useAuditLog, errorMessage, type Product, type Supplier, type StockMovement, type AuditFilters, useUsers, useChangeUserRole, useChangeUserPassword, useChangeOwnPassword, useDeleteUser, type UserRecord } from '@/hooks/useWmsQueries';
import { DashboardView } from '@/features/wms/views/DashboardView';
import { ProductsView, type ProductFilter } from '@/features/wms/views/ProductsView';
import { SuppliersView } from '@/features/wms/views/SuppliersView';
import { MovementsView, MOVEMENT_PAGE_SIZE } from '@/features/wms/views/MovementsView';
import { ReportView } from '@/features/wms/views/ReportView';
import { AuditView, AUDIT_PAGE_SIZE } from '@/features/wms/views/AuditView';
import { UsersView } from '@/features/wms/views/UsersView';
import { LoginScreen } from '@/features/wms/components/LoginScreen';
import { CommandPalette } from '@/features/wms/components/CommandPalette';
import { StatusChip } from '@/features/wms/components/Primitives';
import { createWmsTheme, SIDEBAR, LAYOUT } from '@/features/wms/theme';
import { formatDateTime } from '@/features/wms/dates';
import { filterProducts } from '@/features/wms/productFilters';
import { TRANSLATIONS, Lang, TKey, LANG_FLAGS, LANG_KEY, THEME_KEY, LOW_STOCK_NOTIF_KEY } from '@/features/wms/i18n';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH, API } from '@/features/wms/constants';
import { WmsRole, PERMISSIONS, PageId, canOpenPage, normalizeRole } from '@/features/wms/permissions';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

const PAGE_TO_PATH: Record<PageId, string> = {
  dashboard: '/dashboard', products: '/products', suppliers: '/suppliers', movements: '/movements',
  report: '/reports', audit: '/audit', users: '/users',
};
const PATH_TO_PAGE: Record<string, PageId> = Object.fromEntries(
  (Object.keys(PAGE_TO_PATH) as PageId[]).map((id) => [PAGE_TO_PATH[id], id]),
) as Record<string, PageId>;

type Severity = 'success' | 'error' | 'warning' | 'info';
type MovementForm = { productId: number | ''; movementType: 'IN' | 'OUT'; quantity: number | ''; unitCost: number | '' };
const EMPTY_MOVEMENT: MovementForm = { productId: '', movementType: 'IN', quantity: '', unitCost: '' };
const EMPTY_PW = { current: '', next: '', confirm: '' };

function Home() {
  // ── Language ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after hydration; reading it during render would cause a server/client mismatch
      if (saved && saved in TRANSLATIONS) setLang(saved);
    } catch { /* ignore */ }
  }, []);
  const t = useCallback((key: TKey) => TRANSLATIONS[lang][key], [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const handleLangChange = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  // Light is the default for everyone (office use); dark is a persisted personal choice, not derived from the OS.
  const [darkMode, setDarkMode] = useState<boolean>(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after hydration; reading it during render would cause a server/client mismatch
      if (localStorage.getItem(THEME_KEY) === 'dark') setDarkMode(true);
    } catch { /* ignore */ }
  }, []);
  const isDark = darkMode;
  const theme = useMemo(() => createWmsTheme(isDark), [isDark]);
  const toggleDarkMode = () => {
    const next = !isDark;
    setDarkMode(next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
  };

  // ── Auth state ────────────────────────────────────────────────────────────
  const [auth, setAuth] = useState<{ username: string; role: WmsRole } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const perms = auth ? PERMISSIONS[auth.role] : PERMISSIONS.STAFF;

  // ── Navigation (URL-based routing) ───────────────────────────────────────
  const router = useRouter();
  const pathname = usePathname();
  const requestedPage = PATH_TO_PAGE[pathname] ?? 'dashboard';
  const page: PageId = canOpenPage(perms, requestedPage) ? requestedPage : 'dashboard';
  const setPage = (id: PageId) => { router.push(PAGE_TO_PATH[id]); };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('inv.sidebarCollapsed') === '1'; } catch { return false; }
  });
  const setSidebarCollapsed = (update: (v: boolean) => boolean) => {
    setSidebarCollapsedState((v) => {
      const next = update(v);
      try { window.localStorage.setItem('inv.sidebarCollapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<ProductFilter>('active');
  const [movementProductFilter, setMovementProductFilter] = useState<number | ''>('');
  const [movementPage, setMovementPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({});
  const [langOpen, setLangOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  useEffect(() => {
    const handle401 = () => {
      setAuth((current) => {
        if (current) setSessionExpired(true);
        return null;
      });
      queryClient.clear();
    };
    window.addEventListener('wms:unauthorized', handle401);
    return () => window.removeEventListener('wms:unauthorized', handle401);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setCmdQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Dialog state ──────────────────────────────────────────────────────────
  // Only one dialog is open at a time, so they share one inline error message.
  const [formError, setFormError] = useState('');
  const [productDialog, setProductDialog] = useState<Partial<Product> | null>(null);
  const [deactivateDialog, setDeactivateDialog] = useState<Product | null>(null);
  const [supplierDialog, setSupplierDialog] = useState<Partial<Supplier> | null>(null);
  const [deleteSupplierDialog, setDeleteSupplierDialog] = useState<Supplier | null>(null);
  const [movementDialog, setMovementDialog] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementForm>(EMPTY_MOVEMENT);
  const [reverseDialog, setReverseDialog] = useState<StockMovement | null>(null);
  const [reverseReasonCode, setReverseReasonCode] = useState('');
  const [productDetail, setProductDetail] = useState<Product | null>(null);
  const [changeRoleDialog, setChangeRoleDialog] = useState<{ user: UserRecord; role: string } | null>(null);
  const [resetPwUser, setResetPwUser] = useState<UserRecord | null>(null);
  const [ownPwOpen, setOwnPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [deleteUserDialog, setDeleteUserDialog] = useState<UserRecord | null>(null);

  const [snack, setSnack] = useState<{ msg: string; severity: Severity } | null>(null);
  const showSnack = useCallback((msg: string, severity: Severity = 'success') => setSnack({ msg, severity }), []);

  const closeDialogs = () => {
    setFormError('');
    setProductDialog(null); setDeactivateDialog(null); setSupplierDialog(null); setDeleteSupplierDialog(null);
    setMovementDialog(false); setReverseDialog(null); setChangeRoleDialog(null); setResetPwUser(null);
    setOwnPwOpen(false); setDeleteUserDialog(null);
  };

  // ── Check auth on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json() as Promise<{ username: string; role: string }>;
        throw new Error('not authenticated');
      })
      .then((u) => setAuth({ username: u.username, role: normalizeRole(u.role) }))
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────
  const enabled = !!auth;
  const productsQ = useProducts({ enabled });
  const suppliersQ = useSuppliers({ enabled });
  const movementsQ = useMovements({ productId: movementProductFilter || undefined, page: movementPage, size: MOVEMENT_PAGE_SIZE, enabled });
  const reportQ = useStockReport({ enabled });
  const auditQ = useAuditLog({ ...auditFilters, page: auditPage, size: AUDIT_PAGE_SIZE, enabled: enabled && perms.canSeeAudit });
  // The dashboard works from the latest 200 movements (README, known limitations)
  const allMovementsQ = useMovements({ size: 200, enabled });
  const usersQ = useUsers({ enabled: enabled && perms.canManageUsers });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const recordMovement = useRecordMovement();
  const reverseMovement = useReverseMovement();
  const changeUserRole = useChangeUserRole();
  const changeUserPassword = useChangeUserPassword();
  const changeOwnPassword = useChangeOwnPassword();
  const deleteUser = useDeleteUser();

  // ── Low stock notification (once per session) ─────────────────────────────
  useEffect(() => {
    if (!productsQ.data) return;
    try {
      if (sessionStorage.getItem(LOW_STOCK_NOTIF_KEY)) return;
    } catch { /* ignore */ }
    const lowCount = productsQ.data.filter((p) => p.active && p.reorderLevel != null && p.stock <= p.reorderLevel).length;
    if (lowCount > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time notification once the product list has loaded
      showSnack(`${t('lowStockAlert')}: ${lowCount} ${t('lowStockAlertMsg')}`, 'warning');
      try { sessionStorage.setItem(LOW_STOCK_NOTIF_KEY, '1'); } catch { /* ignore */ }
    }
  }, [productsQ.data, t, showSnack]);

  // ── Computed data ─────────────────────────────────────────────────────────
  const filteredProducts = useMemo(
    () => filterProducts(productsQ.data ?? [], { search, filter: productFilter }),
    [productsQ.data, search, productFilter],
  );

  const supplierProductCount = useMemo(() => {
    const map = new Map<number, number>();
    (productsQ.data ?? []).filter((p) => p.active).forEach((p) => {
      if (p.supplier?.id != null) map.set(p.supplier.id, (map.get(p.supplier.id) ?? 0) + 1);
    });
    return map;
  }, [productsQ.data]);

  // FIFO value per product comes from the server (remaining units x the cost of the lot they came from)
  const reportRows = useMemo(() => {
    const activeById = new Map((productsQ.data ?? []).map((p) => [p.id, p.active]));
    return (reportQ.data ?? []).map((r) => ({ ...r, fifoValue: r.inventoryValue ?? 0, active: activeById.get(r.productId) ?? true }));
  }, [reportQ.data, productsQ.data]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? '__INVALID_CREDENTIALS__' : r.status === 429 ? '__RATE_LIMIT__' : '__SERVER_ERROR__');
      const u = (await r.json()) as { username: string; role: string };
      setAuth({ username: u.username, role: normalizeRole(u.role) });
      setSessionExpired(false);
      setLoginForm({ username: '', password: '' });
      router.push('/dashboard');
      try { sessionStorage.removeItem(LOW_STOCK_NOTIF_KEY); } catch { /* ignore */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setLoginError(t(msg === '__INVALID_CREDENTIALS__' ? 'loginInvalid' : msg === '__RATE_LIMIT__' ? 'loginRateLimited' : msg === '__SERVER_ERROR__' ? 'loginServerError' : 'loginConnection'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAccountAnchor(null);
    setAuth(null);
    setSessionExpired(false);
    router.push('/dashboard');
    queryClient.clear();
    closeDialogs();
    try { sessionStorage.removeItem(LOW_STOCK_NOTIF_KEY); } catch { /* ignore */ }
    fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  // ── Product handlers ──────────────────────────────────────────────────────
  const openProductDialog = (p: Partial<Product>) => { setFormError(''); setProductDialog(p); };
  const handleSaveProduct = async () => {
    if (!productDialog) return;
    if (!productDialog.name?.trim() || !productDialog.articleNumber?.trim()) { setFormError(`${t('name')} / ${t('articleNumber')} ${t('fieldRequired')}`); return; }
    if ((productDialog.unitPrice ?? 0) < 0 || (productDialog.reorderLevel ?? 0) < 0) { setFormError(t('mustBeNonNegative')); return; }
    try {
      if (productDialog.id) {
        await updateProduct.mutateAsync({ ...productDialog, id: productDialog.id });
        if (productDetail?.id === productDialog.id) setProductDetail(null);
      } else {
        await createProduct.mutateAsync(productDialog);
      }
      showSnack(t('productSaved'));
      closeDialogs();
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const handleToggleActive = async (p: Product) => {
    if (p.active) { setFormError(''); setDeactivateDialog(p); return; }
    try {
      await updateProduct.mutateAsync({ ...p, active: true });
      showSnack(t('productReactivated'));
    } catch (e) {
      showSnack(errorMessage(e), 'error');
    }
  };
  const handleDeactivate = async () => {
    if (!deactivateDialog) return;
    try {
      await deleteProduct.mutateAsync(deactivateDialog.id);
      showSnack(t('productDeactivated'));
      if (productDetail?.id === deactivateDialog.id) setProductDetail(null);
      closeDialogs();
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  // ── Movement handlers ─────────────────────────────────────────────────────
  const openMovementDialog = (type: 'IN' | 'OUT' = 'IN', productId?: number) => {
    setFormError('');
    setMovementForm({ ...EMPTY_MOVEMENT, movementType: type, productId: productId ?? '' });
    setMovementDialog(true);
  };
  const handleRecordMovement = async () => {
    if (!movementForm.productId || !movementForm.quantity) return;
    if (movementForm.movementType === 'IN' && (movementForm.unitCost === '' || Number(movementForm.unitCost) < 0)) {
      setFormError(t('unitCostRequired'));
      return;
    }
    try {
      await recordMovement.mutateAsync({
        productId: Number(movementForm.productId),
        movementType: movementForm.movementType,
        quantity: Number(movementForm.quantity),
        unitCost: movementForm.movementType === 'IN' ? Number(movementForm.unitCost) : undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      showSnack(t('movementBooked'));
      closeDialogs();
      setMovementForm(EMPTY_MOVEMENT);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const handleReverseMovement = async () => {
    if (!reverseDialog) return;
    if (!reverseReasonCode.trim()) { setFormError(t('reasonCodeRequired')); return; }
    try {
      await reverseMovement.mutateAsync({ id: reverseDialog.id, reasonCode: reverseReasonCode.trim() });
      showSnack(t('movementReversed'));
      closeDialogs();
      setReverseReasonCode('');
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  // ── Supplier handlers ─────────────────────────────────────────────────────
  const handleSaveSupplier = async () => {
    if (!supplierDialog) return;
    if (!supplierDialog.companyName?.trim()) { setFormError(`${t('companyName')} ${t('fieldRequired')}`); return; }
    try {
      if (supplierDialog.id) await updateSupplier.mutateAsync({ ...supplierDialog, id: supplierDialog.id });
      else await createSupplier.mutateAsync(supplierDialog);
      showSnack(t('supplierSaved'));
      closeDialogs();
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };
  const handleDeleteSupplier = async () => {
    if (!deleteSupplierDialog) return;
    try {
      await deleteSupplier.mutateAsync(deleteSupplierDialog.id);
      showSnack(t('supplierDeleted'));
      closeDialogs();
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  // ── User handlers ─────────────────────────────────────────────────────────
  const openOwnPassword = () => { setAccountAnchor(null); setFormError(''); setPwForm(EMPTY_PW); setOwnPwOpen(true); };
  const handleResetPasswordClick = (u: UserRecord) => {
    if (u.username === auth?.username) { openOwnPassword(); return; }
    setFormError(''); setPwForm(EMPTY_PW); setResetPwUser(u);
  };
  const pwInvalid = pwForm.next.length < 8 || pwForm.next.length > 100;
  const handleSavePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setFormError(t('passwordMismatch')); return; }
    try {
      if (ownPwOpen) await changeOwnPassword.mutateAsync({ currentPassword: pwForm.current, newPassword: pwForm.next });
      else if (resetPwUser) await changeUserPassword.mutateAsync({ id: resetPwUser.id, currentPassword: '', newPassword: pwForm.next });
      showSnack(t('passwordChanged'));
      closeDialogs();
      setPwForm(EMPTY_PW);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const collapsed = isDesktop && sidebarCollapsed;

  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t('dashboard'), icon: <DashboardIcon /> },
    { id: 'products', label: t('products'), icon: <InventoryIcon /> },
    { id: 'suppliers', label: t('suppliers'), icon: <BusinessIcon /> },
    { id: 'movements', label: t('movements'), icon: <SwapVertIcon /> },
    { id: 'report', label: t('stockReport'), icon: <AssessmentIcon /> },
    { id: 'audit', label: t('auditLog'), icon: <AssignmentIcon /> },
    { id: 'users', label: t('userManagement'), icon: <PeopleIcon /> },
  ];
  const visibleNav = navItems.filter((n) => canOpenPage(perms, n.id));

  if (checkingAuth) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><CircularProgress /></Box>
      </ThemeProvider>
    );
  }

  if (!auth) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginScreen
          t={t} lang={lang} onLang={handleLangChange}
          form={loginForm} onForm={setLoginForm}
          error={loginError} onDismissError={() => setLoginError('')}
          sessionExpired={sessionExpired} loading={loginLoading} onSubmit={handleLogin}
        />
      </ThemeProvider>
    );
  }

  const roleLabel = auth.role === 'ADMIN' ? t('roleAdmin') : auth.role === 'WAREHOUSE_MANAGER' ? t('roleWarehouseManager') : t('roleStaff');
  const roleTone = auth.role === 'ADMIN' ? 'primary' : auth.role === 'WAREHOUSE_MANAGER' ? 'info' : 'neutral';
  const sidebarWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: SIDEBAR.bg, color: SIDEBAR.text }}>
      <Box sx={{ px: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64, overflow: 'hidden', borderBottom: `1px solid ${SIDEBAR.divider}` }}>
        <LocalShippingIcon sx={{ color: '#fff', fontSize: 26, flexShrink: 0 }} />
        {!collapsed && <Typography variant="subtitle1" fontWeight={800} color="#fff" noWrap>Inventory</Typography>}
      </Box>

      <List dense sx={{ flex: 1, px: 1, py: 1.5, overflowY: 'auto' }}>
        {visibleNav.map((item) => {
          const selected = page === item.id;
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  selected={selected}
                  onClick={() => { setPage(item.id); setDrawerOpen(false); setSearch(''); }}
                  sx={{
                    borderRadius: '8px', color: SIDEBAR.text, minHeight: 40,
                    justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1 : 1.5,
                    '&:hover': { bgcolor: SIDEBAR.hover },
                    '&.Mui-selected': { bgcolor: SIDEBAR.active, color: '#fff', '&:hover': { bgcolor: SIDEBAR.active } },
                    '&.Mui-selected .MuiListItemIcon-root': { color: '#fff' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36, color: SIDEBAR.textMuted }}>{item.icon}</ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 700 : 500, noWrap: true, fontSize: '0.875rem' }} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: SIDEBAR.divider }} />
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
          {auth.username.slice(0, 2).toUpperCase()}
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="#fff" fontWeight={600} noWrap>{auth.username}</Typography>
            <Typography variant="caption" sx={{ color: SIDEBAR.textMuted }} noWrap component="div">{roleLabel}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  const paperSx = { bgcolor: SIDEBAR.bg, color: SIDEBAR.text, borderRight: 'none', backgroundImage: 'none' };

  const supplierOptions = suppliersQ.data ?? [];
  const selectedProductForMovement = (productsQ.data ?? []).find((p) => p.id === Number(movementForm.productId));
  const movementQty = Number(movementForm.quantity) || 0;
  const movementIsOut = movementForm.movementType === 'OUT';
  const movementInsufficient = !!selectedProductForMovement && movementIsOut && movementQty > selectedProductForMovement.stock;
  const FormErrorAlert = formError ? <Alert severity="error" onClose={() => setFormError('')} sx={{ mb: 2 }}>{formError}</Alert> : null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw' }}>

        {isDesktop ? (
          <Drawer variant="permanent" sx={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.2s ease', '& .MuiDrawer-paper': { ...paperSx, width: sidebarWidth, boxSizing: 'border-box', overflowX: 'hidden', transition: 'width 0.2s ease' } }}>
            {sidebarContent}
          </Drawer>
        ) : (
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ '& .MuiDrawer-paper': { ...paperSx, width: DRAWER_WIDTH, maxWidth: '85vw' } }}>
            {sidebarContent}
          </Drawer>
        )}

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppBar position="sticky" color="inherit">
            <Toolbar sx={{ gap: 0.5, minHeight: 64 }}>
              <IconButton edge="start" aria-label={t('toggleNavigation')} onClick={() => (isDesktop ? setSidebarCollapsed((v) => !v) : setDrawerOpen(true))} sx={{ mr: 0.5 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {navItems.find((n) => n.id === page)?.label ?? t('appTitle')}
              </Typography>

              <Box
                component="button" type="button" onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
                sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: '8px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.default', color: 'text.secondary', minWidth: 190, mr: 0.5, '&:hover, &:focus-visible': { borderColor: 'primary.main', color: 'primary.main' } }}
              >
                <SearchIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ flex: 1, fontSize: '0.8rem' }}>{t('cmdPalettePlaceholder')}</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>Ctrl K</Typography>
              </Box>
              <IconButton size="small" aria-label={t('cmdPalettePlaceholder')} sx={{ display: { xs: 'inline-flex', sm: 'none' } }} onClick={() => { setCmdOpen(true); setCmdQuery(''); }}>
                <SearchIcon />
              </IconButton>

              <Tooltip title={isDark ? t('themeLight') : t('themeDark')}>
                <IconButton onClick={toggleDarkMode} size="small" aria-label={isDark ? t('themeLight') : t('themeDark')}>{isDark ? <LightModeIcon /> : <DarkModeIcon />}</IconButton>
              </Tooltip>
              <Tooltip title={t('language')}>
                <IconButton size="small" aria-label={t('language')} onClick={() => setLangOpen(true)}><LanguageIcon /></IconButton>
              </Tooltip>

              <Box component="button" type="button" onClick={(e: React.MouseEvent<HTMLElement>) => setAccountAnchor(e.currentTarget)} aria-label={t('account')}
                sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, ml: 0.5, pl: 1, pr: { xs: 0.5, sm: 1 }, py: 0.5, borderRadius: '8px', '&:hover, &:focus-visible': { bgcolor: 'action.hover' } }}>
                <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                  {auth.username.slice(0, 2).toUpperCase()}
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}><StatusChip label={roleLabel} tone={roleTone} /></Box>
              </Box>
              <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)}>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{auth.username}</Typography>
                  <Typography variant="caption" color="text.secondary">{roleLabel}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={openOwnPassword}><LockResetIcon fontSize="small" sx={{ mr: 1.5 }} />{t('changeMyPassword')}</MenuItem>
                <MenuItem onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />{t('logout')}</MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3, xl: 4 }, minWidth: 0 }}>
            <Box sx={{ maxWidth: LAYOUT.contentMax, mx: 'auto', minWidth: 0 }}>
              {page === 'dashboard' && (
                <DashboardView t={t} lang={lang} perms={perms} productsQ={productsQ} allMovementsQ={allMovementsQ} reportQ={reportQ}
                  onNavigate={setPage} onBook={openMovementDialog}
                  onShowLowStock={() => { setSearch(''); setProductFilter('low'); setPage('products'); }} />
              )}
              {page === 'products' && (
                <ProductsView t={t} lang={lang} perms={perms} productsQ={productsQ} reportQ={reportQ} filteredProducts={filteredProducts}
                  search={search} onSearch={setSearch} productFilter={productFilter} onFilter={setProductFilter}
                  allMovementsQ={allMovementsQ} detail={productDetail} onOpenDetail={setProductDetail} onCloseDetail={() => setProductDetail(null)}
                  onAdd={() => openProductDialog({})} onEdit={(p) => openProductDialog({ ...p })} onToggleActive={handleToggleActive} />
              )}
              {page === 'suppliers' && (
                <SuppliersView t={t} lang={lang} perms={perms} suppliersQ={suppliersQ} supplierProductCount={supplierProductCount}
                  onAdd={() => { setFormError(''); setSupplierDialog({}); }} onEdit={(s) => { setFormError(''); setSupplierDialog({ ...s }); }}
                  onDelete={(s) => { setFormError(''); setDeleteSupplierDialog(s); }} />
              )}
              {page === 'movements' && (
                <MovementsView t={t} lang={lang} perms={perms} productsQ={productsQ} movementsQ={movementsQ}
                  productFilter={movementProductFilter} onProductFilter={(id) => { setMovementProductFilter(id); setMovementPage(0); }}
                  page={movementPage} onPage={setMovementPage} onBook={() => openMovementDialog('IN')}
                  onReverse={(m) => { setFormError(''); setReverseReasonCode(''); setReverseDialog(m); }} />
              )}
              {page === 'report' && <ReportView t={t} lang={lang} perms={perms} rows={reportRows} reportQ={reportQ} />}
              {page === 'audit' && (
                <AuditView t={t} lang={lang} auditFilters={auditFilters}
                  onFilters={(fn) => { setAuditFilters(fn); setAuditPage(0); }} onClear={() => { setAuditFilters({}); setAuditPage(0); }}
                  auditQ={auditQ} page={auditPage} onPage={setAuditPage} />
              )}
              {page === 'users' && (
                <UsersView t={t} lang={lang} usersQ={usersQ} auth={auth}
                  onChangeRole={(u) => { setFormError(''); setChangeRoleDialog({ user: u, role: u.role }); }}
                  onResetPassword={handleResetPasswordClick}
                  onDelete={(u) => { setFormError(''); setDeleteUserDialog(u); }} />
              )}
            </Box>
          </Box>
        </Box>

        {/* ════ DIALOGS ════ */}

        <Dialog open={langOpen} onClose={() => setLangOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('language')}</DialogTitle>
          <DialogContent>
            <Stack spacing={1} sx={{ pt: 1 }}>
              {(Object.keys(LANG_FLAGS) as Lang[]).map((l) => (
                <Button key={l} variant={lang === l ? 'contained' : 'outlined'} onClick={() => { handleLangChange(l); setLangOpen(false); }} startIcon={<span>{LANG_FLAGS[l]}</span>}>
                  {l.toUpperCase()}
                </Button>
              ))}
            </Stack>
          </DialogContent>
        </Dialog>

        {/* Product create / edit */}
        <Dialog open={Boolean(productDialog)} onClose={closeDialogs} maxWidth="sm" fullWidth>
          <DialogTitle>{productDialog?.id ? t('editProduct') : t('addProduct')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <TextField label={t('name')} value={productDialog?.name ?? ''} onChange={(e) => setProductDialog((d) => ({ ...d, name: e.target.value }))} fullWidth required />
              <TextField label={t('articleNumber')} value={productDialog?.articleNumber ?? ''} onChange={(e) => setProductDialog((d) => ({ ...d, articleNumber: e.target.value }))} fullWidth required />
              <TextField label={t('description')} value={productDialog?.description ?? ''} onChange={(e) => setProductDialog((d) => ({ ...d, description: e.target.value }))} fullWidth multiline rows={2} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {perms.canSeeFinancials && (
                  <TextField label={t('unitPrice')} type="number" value={productDialog?.unitPrice ?? ''}
                    onChange={(e) => setProductDialog((d) => ({ ...d, unitPrice: e.target.value ? Number(e.target.value) : undefined }))} fullWidth inputProps={{ min: 0, step: '0.01' }} />
                )}
                <TextField label={t('reorderLevel')} type="number" value={productDialog?.reorderLevel ?? ''}
                  onChange={(e) => setProductDialog((d) => ({ ...d, reorderLevel: e.target.value ? Number(e.target.value) : undefined }))} fullWidth inputProps={{ min: 0 }} />
              </Stack>
              <FormControl fullWidth>
                <InputLabel>{t('supplier_optional')}</InputLabel>
                <Select label={t('supplier_optional')} value={productDialog?.supplier?.id ?? ''}
                  onChange={(e) => {
                    const sup = supplierOptions.find((s) => s.id === e.target.value);
                    setProductDialog((d) => ({ ...d, supplier: sup ?? null }));
                  }}>
                  <MenuItem value="">—</MenuItem>
                  {supplierOptions.map((s) => <MenuItem key={s.id} value={s.id}>{s.companyName}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" onClick={handleSaveProduct} disabled={createProduct.isPending || updateProduct.isPending}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Deactivate product */}
        <Dialog open={Boolean(deactivateDialog)} onClose={closeDialogs} maxWidth="xs" fullWidth>
          <DialogTitle>{t('deactivateConfirm')}</DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Typography fontWeight={700}>{deactivateDialog?.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('deactivateWarning')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" color="error" onClick={handleDeactivate} disabled={deleteProduct.isPending}>{t('deactivate')}</Button>
          </DialogActions>
        </Dialog>

        {/* Supplier create / edit */}
        <Dialog open={Boolean(supplierDialog)} onClose={closeDialogs} maxWidth="sm" fullWidth>
          <DialogTitle>{supplierDialog?.id ? t('editSupplier') : t('addSupplier')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <TextField label={t('companyName')} value={supplierDialog?.companyName ?? ''} onChange={(e) => setSupplierDialog((d) => ({ ...d, companyName: e.target.value }))} fullWidth required />
              <TextField label={t('contactPerson')} value={supplierDialog?.contactPerson ?? ''} onChange={(e) => setSupplierDialog((d) => ({ ...d, contactPerson: e.target.value }))} fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('email')} type="email" value={supplierDialog?.email ?? ''} onChange={(e) => setSupplierDialog((d) => ({ ...d, email: e.target.value }))} fullWidth />
                <TextField label={t('phone')} value={supplierDialog?.phone ?? ''} onChange={(e) => setSupplierDialog((d) => ({ ...d, phone: e.target.value }))} fullWidth />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" onClick={handleSaveSupplier} disabled={createSupplier.isPending || updateSupplier.isPending}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Delete supplier (ADMIN only) */}
        <Dialog open={Boolean(deleteSupplierDialog)} onClose={closeDialogs} maxWidth="xs" fullWidth>
          <DialogTitle>{t('delete')}</DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Typography>{t('deleteConfirm')} <strong>{deleteSupplierDialog?.companyName}</strong>?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" color="error" onClick={handleDeleteSupplier} disabled={deleteSupplier.isPending}>{t('delete')}</Button>
          </DialogActions>
        </Dialog>

        {/* Book stock movement (every role) */}
        <Dialog open={movementDialog} onClose={closeDialogs} maxWidth="sm" fullWidth>
          <DialogTitle>{t('recordMovement')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              <FormControl fullWidth required>
                <InputLabel>{t('product')}</InputLabel>
                <Select label={t('product')} value={movementForm.productId} onChange={(e) => setMovementForm((f) => ({ ...f, productId: e.target.value as number | '' }))}>
                  {(productsQ.data ?? []).filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({p.articleNumber})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>{t('type')}</InputLabel>
                <Select label={t('type')} value={movementForm.movementType} onChange={(e) => setMovementForm((f) => ({ ...f, movementType: e.target.value as 'IN' | 'OUT' }))}>
                  <MenuItem value="IN">{t('stockIn')}</MenuItem>
                  <MenuItem value="OUT">{t('stockOut')}</MenuItem>
                </Select>
              </FormControl>
              <TextField label={t('quantity')} type="number" value={movementForm.quantity}
                onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value ? Number(e.target.value) : '' }))} fullWidth required inputProps={{ min: 1 }} />
              {/* The API needs a unit cost for every stock-in (it creates the FIFO lot), whatever the role.
                  STAFF may enter it but never sees costs afterwards. */}
              {!movementIsOut && (
                <TextField label={t('unitCost')} type="number" value={movementForm.unitCost} required helperText={t('unitCostHelp')}
                  onChange={(e) => setMovementForm((f) => ({ ...f, unitCost: e.target.value ? Number(e.target.value) : '' }))} fullWidth inputProps={{ min: 0, step: '0.01' }} />
              )}
              {selectedProductForMovement && (
                <Box sx={{ p: 2, borderRadius: '8px', border: '1px solid', borderColor: movementInsufficient ? 'error.main' : 'divider', bgcolor: 'background.default' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('currentStockLevel')}</Typography>
                    <StatusChip label={selectedProductForMovement.stock} tone={selectedProductForMovement.stock === 0 ? 'error' : selectedProductForMovement.reorderLevel != null && selectedProductForMovement.stock <= selectedProductForMovement.reorderLevel ? 'warning' : 'success'} />
                  </Stack>
                  {movementQty > 0 && (
                    <Typography variant="caption" color={movementInsufficient ? 'error.main' : 'text.secondary'} fontWeight={movementInsufficient ? 700 : 400} component="div" sx={{ mt: 0.5 }}>
                      {t('stockAfterMovement')}: {selectedProductForMovement.stock} → {movementIsOut ? selectedProductForMovement.stock - movementQty : selectedProductForMovement.stock + movementQty}
                      {movementInsufficient ? ` · ${t('insufficientStock')}` : ''}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" onClick={handleRecordMovement}
              disabled={recordMovement.isPending || !movementForm.productId || !movementForm.quantity || movementInsufficient}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Reverse movement (ADMIN / WAREHOUSE_MANAGER) */}
        <Dialog open={Boolean(reverseDialog)} onClose={closeDialogs} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}><UndoIcon color="warning" /><span>{t('reverseMovement')}</span></Stack>
          </DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Alert severity="warning" sx={{ mb: 2 }}>{t('reverseConfirm')} {t('reverseWarning')}</Alert>
            {reverseDialog && (
              <Box sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2"><strong>{t('product')}:</strong> {reverseDialog.productName}</Typography>
                  <Typography variant="body2"><strong>{t('type')}:</strong> {reverseDialog.movementType}</Typography>
                  <Typography variant="body2"><strong>{t('quantity')}:</strong> {reverseDialog.quantity}</Typography>
                  <Typography variant="body2"><strong>{t('date')}:</strong> {formatDateTime(reverseDialog.occurredAt, lang)}</Typography>
                </Stack>
              </Box>
            )}
            <TextField label={t('reasonCode')} value={reverseReasonCode} onChange={(e) => { setReverseReasonCode(e.target.value); setFormError(''); }}
              fullWidth required helperText={t('reasonCodeHint')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" color="warning" onClick={handleReverseMovement} disabled={reverseMovement.isPending} startIcon={<UndoIcon />}>{t('confirm')}</Button>
          </DialogActions>
        </Dialog>

        {/* Change role (ADMIN) */}
        <Dialog open={Boolean(changeRoleDialog)} onClose={closeDialogs} maxWidth="xs" fullWidth>
          <DialogTitle>{t('changeRole')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              {changeRoleDialog && <Typography variant="body2" color="text.secondary"><strong>{changeRoleDialog.user.username}</strong></Typography>}
              <FormControl fullWidth>
                <InputLabel>{t('role')}</InputLabel>
                <Select label={t('role')} value={changeRoleDialog?.role ?? ''} onChange={(e) => setChangeRoleDialog((d) => (d ? { ...d, role: e.target.value } : d))}>
                  <MenuItem value="ADMIN">{t('roleAdmin')}</MenuItem>
                  <MenuItem value="WAREHOUSE_MANAGER">{t('roleWarehouseManager')}</MenuItem>
                  <MenuItem value="STAFF">{t('roleStaff')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" disabled={changeUserRole.isPending} onClick={async () => {
              if (!changeRoleDialog) return;
              try {
                await changeUserRole.mutateAsync({ id: changeRoleDialog.user.id, role: changeRoleDialog.role });
                showSnack(t('roleChanged'));
                closeDialogs();
              } catch (e) {
                setFormError(errorMessage(e));
              }
            }}>{t('save')}</Button>
          </DialogActions>
        </Dialog>

        {/* Password: own (every role, current password required) or reset of another user (ADMIN) */}
        <Dialog open={ownPwOpen || Boolean(resetPwUser)} onClose={closeDialogs} maxWidth="xs" fullWidth>
          <DialogTitle>{ownPwOpen ? t('changeMyPassword') : t('changePassword')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {FormErrorAlert}
              {resetPwUser && <Typography variant="body2" color="text.secondary"><strong>{resetPwUser.username}</strong></Typography>}
              {ownPwOpen && (
                <TextField label={t('currentPassword')} type="password" autoComplete="current-password" value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} fullWidth required />
              )}
              <TextField label={t('newPassword')} type="password" autoComplete="new-password" value={pwForm.next} helperText={t('minPasswordLength')}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} fullWidth required />
              <TextField label={t('confirmPassword')} type="password" autoComplete="new-password" value={pwForm.confirm}
                error={pwForm.confirm !== '' && pwForm.confirm !== pwForm.next} helperText={pwForm.confirm !== '' && pwForm.confirm !== pwForm.next ? t('passwordMismatch') : ' '}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} fullWidth required />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" onClick={handleSavePassword}
              disabled={changeOwnPassword.isPending || changeUserPassword.isPending || pwInvalid || (ownPwOpen && !pwForm.current) || pwForm.next !== pwForm.confirm}>
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete user (ADMIN) */}
        <Dialog open={Boolean(deleteUserDialog)} onClose={closeDialogs} maxWidth="xs" fullWidth>
          <DialogTitle>{t('deleteUser')}</DialogTitle>
          <DialogContent>
            {FormErrorAlert}
            <Alert severity="error" sx={{ mb: 1 }}>{t('deleteUserConfirm')}</Alert>
            <Typography fontWeight={700}>{deleteUserDialog?.username}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialogs}>{t('cancel')}</Button>
            <Button variant="contained" color="error" disabled={deleteUser.isPending} onClick={async () => {
              if (!deleteUserDialog) return;
              try {
                await deleteUser.mutateAsync(deleteUserDialog.id);
                showSnack(t('userDeleted'));
                closeDialogs();
              } catch (e) {
                setFormError(errorMessage(e));
              }
            }}>{t('delete')}</Button>
          </DialogActions>
        </Dialog>

        <CommandPalette t={t} open={cmdOpen} onClose={() => setCmdOpen(false)} query={cmdQuery} onQuery={setCmdQuery}
          perms={perms} page={page} products={productsQ.data ?? []} onNavigate={setPage} />

        <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={snack?.severity ?? 'success'} onClose={() => setSnack(null)} sx={{ width: '100%' }} icon={snack?.severity === 'warning' ? <WarningIcon /> : undefined}>
            {snack?.msg}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
}
