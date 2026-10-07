'use client';

/**
 * WMS app shell: auth, routing, theme/i18n state and the page views.
 * Shared pieces live in src/features/wms (i18n, permissions, components, exporters).
 */

import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, AppBar, Box, Button, Chip, CircularProgress, CssBaseline, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, IconButton, InputLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Select, Snackbar, Stack, Switch, TextField, ThemeProvider, Toolbar, Tooltip, Typography, createTheme, useMediaQuery } from '@mui/material';
import { Assessment as AssessmentIcon, Assignment as AssignmentIcon, Business as BusinessIcon, Dashboard as DashboardIcon, DarkMode as DarkModeIcon, Inventory as InventoryIcon, Language as LanguageIcon, LightMode as LightModeIcon, LocalShipping as LocalShippingIcon, Logout as LogoutIcon, Menu as MenuIcon, People as PeopleIcon, Search as SearchIcon, SwapVert as SwapVertIcon, Undo as UndoIcon, Warning as WarningIcon, Home as HomeIcon, History as HistoryIcon, Person as PersonIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useMovements, useRecordMovement, useReverseMovement, useStockReport, useAuditLog, type Product, type Supplier, type StockMovement, type AuditFilters, useUsers, useChangeUserRole, useChangeUserPassword, useDeleteUser, type UserRecord } from '@/hooks/useWmsQueries';
import { DashboardView } from '@/features/wms/views/DashboardView';
import { ProductsView } from '@/features/wms/views/ProductsView';
import { SuppliersView } from '@/features/wms/views/SuppliersView';
import { MovementsView } from '@/features/wms/views/MovementsView';
import { ReportView } from '@/features/wms/views/ReportView';
import { AuditView } from '@/features/wms/views/AuditView';
import { UsersView } from '@/features/wms/views/UsersView';
import { TRANSLATIONS, Lang, TKey, LANG_FLAGS, LANG_KEY, THEME_KEY, LOW_STOCK_NOTIF_KEY } from '@/features/wms/i18n';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH, API } from '@/features/wms/constants';
import { WmsRole, PERMISSIONS, normalizeRole } from '@/features/wms/permissions';

// ─── Query Client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

// ─── Main Home Component ──────────────────────────────────────────────────────

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
  const handleLangChange = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after hydration; reading it during render would cause a server/client mismatch
      if (saved !== null) setDarkMode(saved === 'dark');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- same as above
      else setDarkMode(prefersDark);
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- same as above
      setDarkMode(prefersDark);
    }
  }, [prefersDark]);

  const isDark = darkMode ?? prefersDark;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: { main: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
          success: { main: '#16a34a' },
          error: { main: '#dc2626' },
          warning: { main: '#d97706' },
          info: { main: '#0891b2' },
          text: isDark
            ? { primary: '#e5e7eb', secondary: '#9ca3af' }
            : { primary: '#111827', secondary: '#6b7280' },
          divider: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
          background: isDark
            ? { default: '#0b1220', paper: '#111a2e' }
            : { default: '#f8fafc', paper: '#ffffff' },
        },
        shape: { borderRadius: 10 },
        typography: {
          fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
          h4: { fontWeight: 700, letterSpacing: '-0.01em' },
          h5: { fontWeight: 700, letterSpacing: '-0.01em' },
          h6: { fontWeight: 600 },
          button: { textTransform: 'none', fontWeight: 600 },
        },
        components: {
          MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 } } },
          MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
          MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
          MuiTooltip: { defaultProps: { arrow: true } },
          MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(37,99,235,0.04)' } } } },
          MuiTableCell: { styleOverrides: { stickyHeader: { '&.MuiTableCell-alignRight': { textAlign: 'right' as const } }, body: { paddingLeft: '16px', paddingRight: '16px' }, head: { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' } } },
          MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
        },
      }),
    [isDark]
  );

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

  const perms = auth ? PERMISSIONS[auth.role] : PERMISSIONS.STAFF;

  // ── Navigation (URL-based routing) ───────────────────────────────────────
  const router = useRouter();
  const pathname = usePathname();
  const PAGE_TO_PATH: Record<string, string> = {
    dashboard: '/dashboard',
    products: '/products',
    suppliers: '/suppliers',
    movements: '/movements',
    report: '/reports',
    audit: '/audit',
    users: '/users',
  };
  const PATH_TO_PAGE: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/products': 'products',
    '/suppliers': 'suppliers',
    '/movements': 'movements',
    '/reports': 'report',
    '/audit': 'audit',
    '/users': 'users',
  };
  const page = (PATH_TO_PAGE[pathname] ?? 'dashboard') as 'dashboard' | 'products' | 'suppliers' | 'movements' | 'report' | 'audit' | 'users';
  const setPage = (id: 'dashboard' | 'products' | 'suppliers' | 'movements' | 'report' | 'audit' | 'users') => {
    router.push(PAGE_TO_PATH[id] ?? '/dashboard');
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'inactive' | 'low'>('all');
  const [movementProductFilter, setMovementProductFilter] = useState<number | ''>('');
  const [movementPage, setMovementPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({});
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);

  // ── Command Palette (Ctrl+K) ──────────────────────────────────────────────
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  // 401 session-expired: set auth to null to return to login screen
  useEffect(() => {
    const handle401 = () => setAuth(null);
    window.addEventListener('wms:unauthorized', handle401);
    return () => window.removeEventListener('wms:unauthorized', handle401);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setCmdQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [productDialog, setProductDialog] = useState<Partial<Product> | null>(null);
  const [deleteProductDialog, setDeleteProductDialog] = useState<Product | null>(null);
  const [supplierDialog, setSupplierDialog] = useState<Partial<Supplier> | null>(null);
  const [deleteSupplierDialog, setDeleteSupplierDialog] = useState<Supplier | null>(null);
  const [movementDialog, setMovementDialog] = useState(false);
  const [movementForm, setMovementForm] = useState<{
    productId: number | '';
    movementType: 'IN' | 'OUT';
    quantity: number | '';
    unitCost: number | '';
  }>({ productId: '', movementType: 'IN', quantity: '', unitCost: '' });
  const [reverseDialog, setReverseDialog] = useState<StockMovement | null>(null);
  const [reverseReasonCode, setReverseReasonCode] = useState('');
  const [reverseReasonError, setReverseReasonError] = useState('');
  const [productDetailDrawer, setProductDetailDrawer] = useState<Product | null>(null);

  // ── User management state ─────────────────────────────────────────────────
  const [changeRoleDialog, setChangeRoleDialog] = useState<{ user: UserRecord; role: string } | null>(null);
  const [changePasswordDialog, setChangePasswordDialog] = useState<UserRecord | null>(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState<UserRecord | null>(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showSnack = (msg: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => setSnack({ msg, severity });

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
  const movementsQ = useMovements({
    productId: movementProductFilter || undefined,
    page: movementPage,
    size: 50,
    enabled,
  });
  const reportQ = useStockReport({ enabled: enabled && perms.canSeeReportSection });
  const auditQ = useAuditLog({ ...auditFilters, page: auditPage, size: 25, enabled: enabled && perms.canSeeAudit });

  // All movements for trend chart (no filter, first 200)
  const allMovementsQ = useMovements({ size: 200, enabled });

  // User management
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
  const deleteUser = useDeleteUser();

  // ── Low stock notification (once per session) ─────────────────────────────
  useEffect(() => {
    if (!productsQ.data) return;
    try {
      if (sessionStorage.getItem(LOW_STOCK_NOTIF_KEY)) return;
    } catch { /* ignore */ }
    const lowCount = productsQ.data.filter(
      (p) => p.active && p.reorderLevel != null && p.stock <= p.reorderLevel
    ).length;
    if (lowCount > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time notification once the product list has loaded
      showSnack(`${t('lowStockAlert')}: ${lowCount} ${t('lowStockAlertMsg')}`, 'warning');
      try { sessionStorage.setItem(LOW_STOCK_NOTIF_KEY, '1'); } catch { /* ignore */ }
    }
  }, [productsQ.data, t]);

  // ── Computed data ─────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = productsQ.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name ?? '').toLowerCase().includes(q) ||
          (p.articleNumber ?? '').toLowerCase().includes(q) ||
          (p.supplier?.companyName ?? '').toLowerCase().includes(q)
      );
    }
    if (productFilter === 'active') list = list.filter((p) => p.active);
    if (productFilter === 'inactive') list = list.filter((p) => !p.active);
    if (productFilter === 'low')
      list = list.filter((p) => p.reorderLevel != null && p.stock <= p.reorderLevel);
    return list;
  }, [productsQ.data, search, productFilter]);

  const supplierProductCount = useMemo(() => {
    const map = new Map<number, number>();
    (productsQ.data ?? []).forEach((p) => {
      if (p.supplier?.id != null) {
        map.set(p.supplier.id, (map.get(p.supplier.id) ?? 0) + 1);
      }
    });
    return map;
  }, [productsQ.data]);

  // KPIs
  const kpiData = useMemo(() => {
    const products = productsQ.data ?? [];
    const movements = allMovementsQ.data?.content ?? [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const totalIn = movements.filter((m) => m.movementType === 'IN').reduce((s, m) => s + m.quantity, 0);
    const totalOut = movements.filter((m) => m.movementType === 'OUT').reduce((s, m) => s + m.quantity, 0);
    const lowStock = products.filter((p) => p.active && p.reorderLevel != null && p.stock <= p.reorderLevel).length;
    const totalValue = products.reduce((s, p) => s + p.stock * (p.unitPrice ?? 0), 0);
    const todayMovements = movements.filter((m) => m.occurredAt.slice(0, 10) === todayStr).length;
    const criticalStock = products.filter((p) => p.active && p.reorderLevel != null && p.stock === 0).length;
    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.active).length,
      lowStock,
      totalIn,
      totalOut,
      totalValue,
      todayMovements,
      criticalStock,
    };
  }, [productsQ.data, allMovementsQ.data]);

  // FIFO report value
  const reportWithFifo = useMemo(() => {
    const report = reportQ.data ?? [];
    const movements = allMovementsQ.data?.content ?? [];
    return report.map((r) => {
      const prodMovements = movements
        .filter((m) => m.productId === r.productId && m.movementType === 'IN' && (m.totalCost ?? 0) > 0)
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
      const avgCost =
        prodMovements.length > 0
          ? prodMovements.reduce((s, m) => s + (m.totalCost ?? 0), 0) /
            prodMovements.reduce((s, m) => s + m.quantity, 0)
          : 0;
      return { ...r, fifoValue: r.currentStock * avgCost };
    });
  }, [reportQ.data, allMovementsQ.data]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          throw new Error('__INVALID_CREDENTIALS__');
        }
        throw new Error('__SERVER_ERROR__');
      }
      const u = (await r.json()) as { username: string; role: string };
      setAuth({ username: u.username, role: normalizeRole(u.role) });
      setPage('dashboard');
      try { sessionStorage.removeItem(LOW_STOCK_NOTIF_KEY); } catch { /* ignore */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === '__INVALID_CREDENTIALS__') {
        setLoginError(lang === 'tr' ? 'Kullanıcı adı veya şifre hatalı.' : lang === 'de' ? 'Benutzername oder Passwort falsch.' : 'Invalid username or password.');
      } else if (msg === '__SERVER_ERROR__') {
        setLoginError(lang === 'tr' ? 'Sunucu hatası. Lütfen tekrar deneyin.' : lang === 'de' ? 'Serverfehler. Bitte erneut versuchen.' : 'Server error. Please try again.');
      } else {
        setLoginError(lang === 'tr' ? 'Bağlantı hatası. Backend çalışıyor mu?' : lang === 'de' ? 'Verbindungsfehler.' : 'Connection error. Is the backend running?');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear local state immediately for instant UI response
    setAuth(null);
    setPage('dashboard');
    queryClient.clear();
    try { sessionStorage.removeItem(LOW_STOCK_NOTIF_KEY); } catch { /* ignore */ }
    // Fire-and-forget: invalidate server-side session cookie in background
    fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  // ── Product handlers ──────────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productDialog) return;
    try {
      if (productDialog.id) {
        await updateProduct.mutateAsync({ id: productDialog.id, ...productDialog });
        showSnack('Product updated');
      } else {
        await createProduct.mutateAsync(productDialog);
        showSnack('Product created');
      }
      setProductDialog(null);
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductDialog) return;
    try {
      await deleteProduct.mutateAsync(deleteProductDialog.id);
      showSnack('Product deleted');
      setDeleteProductDialog(null);
      if (productDetailDrawer?.id === deleteProductDialog.id) setProductDetailDrawer(null);
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  // ── Movement handlers ─────────────────────────────────────────────────────
  const handleRecordMovement = async () => {
    if (!movementForm.productId || !movementForm.quantity) return;
    try {
      await recordMovement.mutateAsync({
        productId: Number(movementForm.productId),
        movementType: movementForm.movementType,
        quantity: Number(movementForm.quantity),
        unitCost: movementForm.unitCost !== '' ? Number(movementForm.unitCost) : undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      showSnack('Movement recorded');
      setMovementDialog(false);
      setMovementForm({ productId: '', movementType: 'IN', quantity: '', unitCost: '' });
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  const handleReverseMovement = async () => {
    if (!reverseDialog) return;
    if (!reverseReasonCode.trim()) {
      setReverseReasonError(t('reasonCodeRequired'));
      return;
    }
    try {
      await reverseMovement.mutateAsync({ id: reverseDialog.id, reasonCode: reverseReasonCode.trim() });
      showSnack('Movement reversed');
      setReverseDialog(null);
      setReverseReasonCode('');
      setReverseReasonError('');
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  // ── Supplier handlers ─────────────────────────────────────────────────────
  const handleSaveSupplier = async () => {
    if (!supplierDialog) return;
    try {
      if (supplierDialog.id) {
        await updateSupplier.mutateAsync({ id: supplierDialog.id, ...supplierDialog });
        showSnack('Supplier updated');
      } else {
        await createSupplier.mutateAsync(supplierDialog);
        showSnack('Supplier created');
      }
      setSupplierDialog(null);
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplierDialog) return;
    try {
      await deleteSupplier.mutateAsync(deleteSupplierDialog.id);
      showSnack('Supplier deleted');
      setDeleteSupplierDialog(null);
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  // ── Role badge ────────────────────────────────────────────────────────────
  const roleBadge = auth ? (
    <Chip
      size="small"
      label={
        auth.role === 'ADMIN'
          ? t('roleAdmin')
          : auth.role === 'WAREHOUSE_MANAGER'
          ? t('roleWarehouseManager')
          : t('roleStaff')
      }
      color={auth.role === 'ADMIN' ? 'error' : auth.role === 'WAREHOUSE_MANAGER' ? 'primary' : 'default'}
      variant="outlined"
    />
  ) : null;

  // ── Nav items (role-filtered) ─────────────────────────────────────────────
  // ── Responsive breakpoint (must be before conditional returns) ───────────
  const isSmUp = useMediaQuery(theme.breakpoints.up('md'));

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: <DashboardIcon /> },
    { id: 'products', label: t('products'), icon: <InventoryIcon /> },
    ...(perms.canSeeSupplierSection ? [{ id: 'suppliers', label: t('suppliers'), icon: <BusinessIcon /> }] : []),
    { id: 'movements', label: t('movements'), icon: <SwapVertIcon /> },
    ...(perms.canSeeReportSection ? [{ id: 'report', label: t('stockReport'), icon: <AssessmentIcon /> }] : []),
    ...(perms.canSeeAudit ? [{ id: 'audit', label: t('auditLog'), icon: <AssignmentIcon /> }] : []),
    ...(perms.canManageUsers ? [{ id: 'users', label: t('userManagement'), icon: <PeopleIcon /> }] : []),
  ] as { id: typeof page; label: string; icon: React.ReactNode }[];

  // ── Loading / not authenticated ───────────────────────────────────────────
  if (checkingAuth) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 2,
          }}
        >
          <Paper elevation={4} sx={{ p: 5, width: '100%', maxWidth: 420, borderRadius: 3 }}>
            <Stack spacing={3}>
              <Box textAlign="center">
                <LocalShippingIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight={700} mt={1}>
                  {t('appTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to your account
                </Typography>
              </Box>

              {loginError && (
                <Alert severity="error" onClose={() => setLoginError('')}>
                  {loginError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleLogin}>
                <Stack spacing={2}>
                  <TextField
                    label={t('username')}
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                    fullWidth
                    required
                    autoComplete="username"
                    autoFocus
                  />
                  <TextField
                    label={t('password')}
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    fullWidth
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loginLoading}
                    startIcon={loginLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  >
                    {loginLoading ? t('signingIn') : t('login')}
                  </Button>
                </Stack>
              </Box>

              <Alert severity="info" icon={<PeopleIcon />} sx={{ cursor: 'default' }}>
                <Typography variant="caption" component="div" fontWeight={700} mb={0.5}>
                  {t('demoCredentials')} — <em style={{ fontWeight: 400, opacity: 0.8 }}>click to fill</em>
                </Typography>
                {([
                  ['admin', 'admin123', 'ADMIN'],
                  ['warehouse', 'warehouse123', 'WAREHOUSE_MANAGER'],
                  ['staff', 'staff123', 'STAFF'],
                ] as [string, string, string][]).map(([u, p, r]) => (
                  <Box
                    key={u}
                    onClick={() => setLoginForm({ username: u, password: p })}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 1, mb: 0.25, cursor: 'pointer', borderRadius: 0.5, px: 0.5, '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } }}
                  >
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{u}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>/{p}</Typography>
                    <Chip label={r} size="small" variant="outlined" sx={{ fontSize: '0.55rem', height: 16, ml: 0.5 }} />
                  </Box>
                ))}
              </Alert>

              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                {(Object.keys(LANG_FLAGS) as Lang[]).map((l) => (
                  <Chip
                    key={l}
                    label={`${LANG_FLAGS[l]} ${l.toUpperCase()}`}
                    size="small"
                    onClick={() => handleLangChange(l)}
                    variant={lang === l ? 'filled' : 'outlined'}
                    color={lang === l ? 'primary' : 'default'}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  // ── Sidebar drawer content ────────────────────────────────────────────────
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64, overflow: 'hidden' }}>
        <LocalShippingIcon sx={{ color: 'primary.main', fontSize: 28, flexShrink: 0 }} />
        {(!isSmUp || !sidebarCollapsed) && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.1} noWrap>
              WMS
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {auth.username}
            </Typography>
          </Box>
        )}
      </Box>

      {(!isSmUp || !sidebarCollapsed) && <Box sx={{ px: 1.5, mb: 1 }}>{roleBadge}</Box>}
      <Divider sx={{ mb: 1 }} />

      <List dense sx={{ flex: 1, px: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
            <Tooltip title={(isSmUp && sidebarCollapsed) ? item.label : ''} placement="right">
              <ListItemButton
                selected={page === item.id}
                onClick={() => {
                  setPage(item.id);
                  setDrawerOpen(false);
                  setSearch('');
                }}
                sx={{
                  borderRadius: 1.5,
                  justifyContent: (isSmUp && sidebarCollapsed) ? 'center' : 'flex-start',
                  px: (isSmUp && sidebarCollapsed) ? 1 : 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    '& .MuiListItemIcon-root': { color: '#fff' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: (isSmUp && sidebarCollapsed) ? 'auto' : 36 }}>{item.icon}</ListItemIcon>
                {(!isSmUp || !sidebarCollapsed) && (
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: page === item.id ? 700 : 400 }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Divider />
      <List dense sx={{ px: 1 }}>
        <ListItem disablePadding>
          <Tooltip title={(isSmUp && sidebarCollapsed) ? t('logout') : ''} placement="right">
            <ListItemButton onClick={handleLogout} sx={{
              borderRadius: 1.5,
              justifyContent: (isSmUp && sidebarCollapsed) ? 'center' : 'flex-start',
              px: (isSmUp && sidebarCollapsed) ? 1 : 2,
            }}>
              <ListItemIcon sx={{ minWidth: (isSmUp && sidebarCollapsed) ? 'auto' : 36 }}>
                <LogoutIcon />
              </ListItemIcon>
              {(!isSmUp || !sidebarCollapsed) && <ListItemText primary={t('logout')} />}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── Sidebar ── */}
        {isSmUp ? (
          <Drawer
            variant="permanent"
            sx={{
              width: sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
              flexShrink: 0,
              transition: 'width 0.25s ease',
              '& .MuiDrawer-paper': {
                width: sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: '1px solid',
                borderColor: 'divider',
                overflowX: 'hidden',
                transition: 'width 0.25s ease',
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        ) : (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* ── Main area ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* ── AppBar ── */}
          <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>
            <Toolbar sx={{ gap: 1 }}>
              {!isSmUp ? (
                <IconButton edge="start" onClick={() => setDrawerOpen(true)}>
                  <MenuIcon />
                </IconButton>
              ) : (
                <IconButton edge="start" onClick={() => setSidebarCollapsed((v) => !v)} sx={{ mr: 0.5 }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }} noWrap>
                {navItems.find((n) => n.id === page)?.label ?? t('appTitle')}
              </Typography>

              {/* Command Palette button */}
              <Tooltip title={`${t('cmdPalettePlaceholder')} (Ctrl+K)`}>
                <Box
                  onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    bgcolor: 'background.default',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    mr: 0.5,
                    minWidth: 160,
                  }}
                >
                  <SearchIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ flex: 1, fontSize: '0.8rem' }}>
                    {t('cmdPalettePlaceholder')}...
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <Chip label="Ctrl" size="small" sx={{ fontSize: '0.6rem', height: 18, px: 0 }} />
                    <Chip label="K" size="small" sx={{ fontSize: '0.6rem', height: 18, px: 0 }} />
                  </Box>
                </Box>
              </Tooltip>
              <Tooltip title="Search (Ctrl+K)" sx={{ display: { xs: 'flex', sm: 'none' } }}>
                <IconButton size="small" onClick={() => { setCmdOpen(true); setCmdQuery(''); }}>
                  <SearchIcon />
                </IconButton>
              </Tooltip>

              {/* Theme toggle */}
              <Tooltip title={isDark ? t('themeLight') : t('themeDark')}>
                <IconButton onClick={toggleDarkMode} size="small">
                  {isDark ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>

              {/* Language menu */}
              <Tooltip title={t('language')}>
                <IconButton size="small" onClick={(e) => setLangAnchor(e.currentTarget)}>
                  <LanguageIcon />
                </IconButton>
              </Tooltip>
              <Dialog open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)} maxWidth="xs">
                <DialogTitle>{t('language')}</DialogTitle>
                <DialogContent>
                  <Stack spacing={1}>
                    {(Object.keys(LANG_FLAGS) as Lang[]).map((l) => (
                      <Button
                        key={l}
                        variant={lang === l ? 'contained' : 'outlined'}
                        onClick={() => { handleLangChange(l); setLangAnchor(null); }}
                        startIcon={<span>{LANG_FLAGS[l]}</span>}
                      >
                        {l.toUpperCase()}
                      </Button>
                    ))}
                  </Stack>
                </DialogContent>
              </Dialog>

              {roleBadge}
            </Toolbar>
          </AppBar>

          {/* ── Page content ── */}
          <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>

            {/* ════ DASHBOARD ════ */}
            {page === 'dashboard' && <DashboardView t={t} lang={lang} kpiData={kpiData} perms={perms} productsQ={productsQ} setPage={setPage} auth={auth} setMovementForm={setMovementForm} setMovementDialog={setMovementDialog} allMovementsQ={allMovementsQ} />}

            {/* ════ PRODUCTS ════ */}
            {page === 'products' && <ProductsView t={t} perms={perms} setProductDialog={setProductDialog} search={search} setSearch={setSearch} productFilter={productFilter} setProductFilter={setProductFilter} productsQ={productsQ} filteredProducts={filteredProducts} setProductDetailDrawer={setProductDetailDrawer} lang={lang} updateProduct={updateProduct} setDeleteProductDialog={setDeleteProductDialog} productDetailDrawer={productDetailDrawer} allMovementsQ={allMovementsQ} />}

            {/* ════ SUPPLIERS ════ */}
            {page === 'suppliers' && perms.canSeeSupplierSection && <SuppliersView t={t} perms={perms} setSupplierDialog={setSupplierDialog} suppliersQ={suppliersQ} supplierProductCount={supplierProductCount} setDeleteSupplierDialog={setDeleteSupplierDialog} />}

            {/* ════ MOVEMENTS ════ */}
            {page === 'movements' && <MovementsView t={t} setMovementDialog={setMovementDialog} kpiData={kpiData} perms={perms} lang={lang} movementProductFilter={movementProductFilter} setMovementProductFilter={setMovementProductFilter} setMovementPage={setMovementPage} productsQ={productsQ} reportWithFifo={reportWithFifo} movementsQ={movementsQ} setReverseDialog={setReverseDialog} setReverseReasonCode={setReverseReasonCode} setReverseReasonError={setReverseReasonError} movementPage={movementPage} />}

            {/* ════ STOCK REPORT ════ */}
            {page === 'report' && perms.canSeeReportSection && <ReportView t={t} reportWithFifo={reportWithFifo} perms={perms} lang={lang} reportQ={reportQ} />}

            {/* ════ AUDIT LOG ════ */}
            {page === 'audit' && perms.canSeeAudit && <AuditView t={t} auditFilters={auditFilters} setAuditFilters={setAuditFilters} setAuditPage={setAuditPage} auditQ={auditQ} auditPage={auditPage} />}

            {/* ════ USERS ════ */}
            {page === 'users' && perms.canManageUsers && <UsersView t={t} usersQ={usersQ} auth={auth} setChangeRoleDialog={setChangeRoleDialog} setChangePasswordDialog={setChangePasswordDialog} setPwForm={setPwForm} setDeleteUserDialog={setDeleteUserDialog} />}
          </Box>
        </Box>

        {/* ════ DIALOGS ════ */}

        {/* Product dialog */}
        <Dialog open={Boolean(productDialog)} onClose={() => setProductDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{productDialog?.id ? t('editProduct') : t('addProduct')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <TextField
                label={t('name')}
                value={productDialog?.name ?? ''}
                onChange={(e) => setProductDialog((d) => ({ ...d, name: e.target.value }))}
                fullWidth required
              />
              <TextField
                label={t('articleNumber')}
                value={productDialog?.articleNumber ?? ''}
                onChange={(e) => setProductDialog((d) => ({ ...d, articleNumber: e.target.value }))}
                fullWidth required
              />
              <TextField
                label={t('description')}
                value={productDialog?.description ?? ''}
                onChange={(e) => setProductDialog((d) => ({ ...d, description: e.target.value }))}
                fullWidth multiline rows={2}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('unitPrice')}
                  type="number"
                  value={productDialog?.unitPrice ?? ''}
                  onChange={(e) => setProductDialog((d) => ({ ...d, unitPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  fullWidth
                />
                <TextField
                  label={t('reorderLevel')}
                  type="number"
                  value={productDialog?.reorderLevel ?? ''}
                  onChange={(e) => setProductDialog((d) => ({ ...d, reorderLevel: e.target.value ? Number(e.target.value) : undefined }))}
                  fullWidth
                />
              </Stack>
              <FormControl fullWidth>
                <InputLabel>{t('supplier_optional')}</InputLabel>
                <Select
                  label={t('supplier_optional')}
                  value={productDialog?.supplier?.id ?? ''}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const sup = (suppliersQ.data ?? []).find((s) => s.id === sid);
                    setProductDialog((d) => ({ ...d, supplier: sup ?? null }));
                  }}
                >
                  <MenuItem value="">— {t('all')} —</MenuItem>
                  {(suppliersQ.data ?? []).map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.companyName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={productDialog?.active !== false}
                  onChange={(e) => setProductDialog((d) => ({ ...d, active: e.target.checked }))}
                />
                <Typography variant="body2">{productDialog?.active !== false ? t('active') : t('inactive')}</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProductDialog(null)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleSaveProduct}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete product confirm */}
        <Dialog open={Boolean(deleteProductDialog)} onClose={() => setDeleteProductDialog(null)}>
          <DialogTitle>{t('delete')}</DialogTitle>
          <DialogContent>
            <Typography>{t('deleteConfirm')} <strong>{deleteProductDialog?.name}</strong>?</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteProductDialog(null)}>{t('cancel')}</Button>
            <Button variant="contained" color="error" onClick={handleDeleteProduct} disabled={deleteProduct.isPending}>
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Supplier dialog */}
        <Dialog open={Boolean(supplierDialog)} onClose={() => setSupplierDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{supplierDialog?.id ? t('editSupplier') : t('addSupplier')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <TextField
                label={t('companyName')}
                value={supplierDialog?.companyName ?? ''}
                onChange={(e) => setSupplierDialog((d) => ({ ...d, companyName: e.target.value }))}
                fullWidth required
              />
              <TextField
                label={t('contactPerson')}
                value={supplierDialog?.contactPerson ?? ''}
                onChange={(e) => setSupplierDialog((d) => ({ ...d, contactPerson: e.target.value }))}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('email')}
                  value={supplierDialog?.email ?? ''}
                  onChange={(e) => setSupplierDialog((d) => ({ ...d, email: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label={t('phone')}
                  value={supplierDialog?.phone ?? ''}
                  onChange={(e) => setSupplierDialog((d) => ({ ...d, phone: e.target.value }))}
                  fullWidth
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSupplierDialog(null)}>{t('cancel')}</Button>
            <Button variant="contained" onClick={handleSaveSupplier} disabled={createSupplier.isPending || updateSupplier.isPending}>
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete supplier confirm */}
        <Dialog open={Boolean(deleteSupplierDialog)} onClose={() => setDeleteSupplierDialog(null)}>
          <DialogTitle>{t('delete')}</DialogTitle>
          <DialogContent>
            <Typography>{t('deleteConfirm')} <strong>{deleteSupplierDialog?.name}</strong>?</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteSupplierDialog(null)}>{t('cancel')}</Button>
            <Button variant="contained" color="error" onClick={handleDeleteSupplier} disabled={deleteSupplier.isPending}>
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Record movement dialog */}
        <Dialog open={movementDialog} onClose={() => setMovementDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('recordMovement')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <FormControl fullWidth required>
                <InputLabel>{t('product')}</InputLabel>
                <Select
                  label={t('product')}
                  value={movementForm.productId}
                  onChange={(e) => setMovementForm((f) => ({ ...f, productId: e.target.value as number | '' }))}
                >
                  {(productsQ.data ?? []).filter((p) => p.active).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} (#{p.articleNumber})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>{t('type')}</InputLabel>
                <Select
                  label={t('type')}
                  value={movementForm.movementType}
                  onChange={(e) => setMovementForm((f) => ({ ...f, movementType: e.target.value as 'IN' | 'OUT' }))}
                >
                  <MenuItem value="IN">{t('stockIn')}</MenuItem>
                  <MenuItem value="OUT">{t('stockOut')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('quantity')}
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value ? Number(e.target.value) : '' }))}
                fullWidth required
                inputProps={{ min: 1 }}
              />
              {perms.canSeeMovementCost && (
                <TextField
                  label={t('unitCost')}
                  type="number"
                  value={movementForm.unitCost}
                  onChange={(e) => setMovementForm((f) => ({ ...f, unitCost: e.target.value ? Number(e.target.value) : '' }))}
                  fullWidth
                />
              )}

              {/* Current stock info card */}
              {movementForm.productId !== '' && (() => {
                const sel = (productsQ.data ?? []).find((p) => p.id === Number(movementForm.productId));
                if (!sel) return null;
                const qty = Number(movementForm.quantity) || 0;
                const isOut = movementForm.movementType === 'OUT';
                const stockAfter = isOut ? sel.stock - qty : sel.stock + qty;
                const insufficient = isOut && qty > sel.stock;
                return (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: insufficient ? 'error.main' : 'divider', bgcolor: insufficient ? 'error.50' : 'background.default' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {t('currentStockLevel')}
                      </Typography>
                      <Chip
                        label={sel.stock}
                        size="small"
                        color={sel.stock === 0 ? 'error' : sel.reorderLevel != null && sel.stock <= sel.reorderLevel ? 'warning' : 'success'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    {qty > 0 && (
                      <Stack direction="row" alignItems="center" gap={0.5} mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {isOut ? t('stockOut') : t('stockIn')}: {sel.stock} → {Math.max(0, stockAfter)}
                        </Typography>
                        {insufficient && (
                          <Typography variant="caption" color="error.main" fontWeight={700} ml={1}>
                            ⚠ {t('insufficientStock')}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </Paper>
                );
              })()}

            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMovementDialog(false)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleRecordMovement}
              disabled={recordMovement.isPending || !movementForm.productId || !movementForm.quantity || (() => {
                if (movementForm.movementType === 'OUT' && movementForm.productId !== ('' as unknown) && movementForm.quantity !== ('' as unknown)) {
                  const sel = (productsQ.data ?? []).find((p) => p.id === Number(movementForm.productId));
                  return sel ? Number(movementForm.quantity) > sel.stock : false;
                }
                return false;
              })()}
            >
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reverse movement dialog */}
        <Dialog open={Boolean(reverseDialog)} onClose={() => setReverseDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <UndoIcon color="warning" />
              <span>{t('reverseMovement')}</span>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('reverseConfirm')}
              <br />
              {t('reverseWarning')}
            </Alert>
            {reverseDialog && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2"><strong>{t('product')}:</strong> {reverseDialog.productName}</Typography>
                  <Typography variant="body2"><strong>{t('type')}:</strong> {reverseDialog.movementType}</Typography>
                  <Typography variant="body2"><strong>{t('quantity')}:</strong> {reverseDialog.quantity}</Typography>
                  <Typography variant="body2"><strong>{t('date')}:</strong> {new Date(reverseDialog.occurredAt).toLocaleString()}</Typography>
                </Stack>
              </Paper>
            )}
            <TextField
              label={t('reasonCode')}
              value={reverseReasonCode}
              onChange={(e) => { setReverseReasonCode(e.target.value); setReverseReasonError(''); }}
              fullWidth
              required
              error={Boolean(reverseReasonError)}
              helperText={reverseReasonError}
              placeholder="e.g. DATA_ERROR, CUSTOMER_RETURN, SYSTEM_FIX"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setReverseDialog(null); setReverseReasonCode(''); setReverseReasonError(''); }}>
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleReverseMovement}
              disabled={reverseMovement.isPending}
              startIcon={<UndoIcon />}
            >
              {t('confirm')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Change Role dialog */}
        <Dialog open={Boolean(changeRoleDialog)} onClose={() => setChangeRoleDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('changeRole')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {changeRoleDialog && (
                <Typography variant="body2" color="text.secondary">
                  <strong>{changeRoleDialog.user.username}</strong> — {t('role')}
                </Typography>
              )}
              <FormControl fullWidth>
                <InputLabel>{t('role')}</InputLabel>
                <Select
                  label={t('role')}
                  value={changeRoleDialog?.role ?? ''}
                  onChange={(e) => setChangeRoleDialog((d) => d ? { ...d, role: e.target.value } : d)}
                >
                  <MenuItem value="ADMIN">{t('roleAdmin')}</MenuItem>
                  <MenuItem value="WAREHOUSE_MANAGER">{t('roleWarehouseManager')}</MenuItem>
                  <MenuItem value="STAFF">{t('roleStaff')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangeRoleDialog(null)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              disabled={changeUserRole.isPending}
              onClick={async () => {
                if (!changeRoleDialog) return;
                try {
                  await changeUserRole.mutateAsync({ id: changeRoleDialog.user.id, role: changeRoleDialog.role });
                  showSnack(t('roleChanged'));
                  setChangeRoleDialog(null);
                } catch (e) {
                  showSnack(e instanceof Error ? e.message : 'Error', 'error');
                }
              }}
            >
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Change Password dialog */}
        <Dialog open={Boolean(changePasswordDialog)} onClose={() => setChangePasswordDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('changePassword')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {changePasswordDialog && changePasswordDialog.username !== auth?.username && (
                <Alert severity="info" sx={{ mb: 1 }}>
Resetting another user&apos;s password as admin.
                </Alert>
              )}
              {changePasswordDialog && changePasswordDialog.username === auth?.username && (
                <TextField
                  label={t('currentPassword')}
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  fullWidth
                  required
                />
              )}
              <TextField
                label={t('newPassword')}
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                fullWidth
                required
                helperText={t('minPasswordLength')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangePasswordDialog(null)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              color="warning"
              disabled={changeUserPassword.isPending || pwForm.newPassword.length < 8}
              onClick={async () => {
                if (!changePasswordDialog) return;
                try {
                  await changeUserPassword.mutateAsync({
                    id: changePasswordDialog.id,
                    currentPassword: pwForm.currentPassword,
                    newPassword: pwForm.newPassword,
                  });
                  showSnack(t('passwordChanged'));
                  setChangePasswordDialog(null);
                  setPwForm({ currentPassword: '', newPassword: '' });
                } catch (e) {
                  showSnack(e instanceof Error ? e.message : 'Error', 'error');
                }
              }}
            >
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete user confirm */}
        <Dialog open={Boolean(deleteUserDialog)} onClose={() => setDeleteUserDialog(null)}>
          <DialogTitle>{t('deleteUser')}</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 1 }}>
              {t('deleteUserConfirm')}
            </Alert>
            <Typography><strong>{deleteUserDialog?.username}</strong></Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>{t('deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteUserDialog(null)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              color="error"
              disabled={deleteUser.isPending}
              onClick={async () => {
                if (!deleteUserDialog) return;
                try {
                  await deleteUser.mutateAsync(deleteUserDialog.id);
                  showSnack(t('userDeleted'));
                  setDeleteUserDialog(null);
                } catch (e) {
                  showSnack(e instanceof Error ? e.message : 'Error', 'error');
                }
              }}
            >
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Command Palette (Ctrl+K) */}
        <Dialog
          open={cmdOpen}
          onClose={() => setCmdOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', p: 0 } }}
          TransitionProps={{ onEntered: () => { const el = document.getElementById('cmd-input'); if (el) el.focus(); } }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <input
                id="cmd-input"
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder={t('cmdPalettePlaceholder')}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 16, flex: 1, color: 'inherit', fontFamily: 'inherit' }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setCmdOpen(false);
                }}
              />
              <Chip label={t('cmdPaletteHint')} size="small" variant="outlined" sx={{ fontSize: '0.65rem', opacity: 0.6 }} />
            </Box>
          </Box>
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {(() => {
              const q = cmdQuery.trim().toLowerCase();
              type CmdPage = 'dashboard' | 'products' | 'suppliers' | 'movements' | 'report' | 'audit' | 'users';
              const navItems = ([
                { label: t('dashboard'), page: 'dashboard', icon: <HomeIcon fontSize="small" /> },
                { label: t('products'), page: 'products', icon: <InventoryIcon fontSize="small" /> },
                ...(perms.canSeeSupplierSection ? [{ label: t('suppliers'), page: 'suppliers' as CmdPage, icon: <BusinessIcon fontSize="small" /> }] : []),
                { label: t('movements'), page: 'movements', icon: <SwapHorizIcon fontSize="small" /> },
                { label: t('stockReport'), page: 'report', icon: <AssessmentIcon fontSize="small" /> },
                ...(perms.canSeeAudit ? [{ label: t('auditLog'), page: 'audit' as CmdPage, icon: <HistoryIcon fontSize="small" /> }] : []),
                ...(perms.canManageUsers ? [{ label: t('userManagement'), page: 'users' as CmdPage, icon: <PersonIcon fontSize="small" /> }] : []),
              ] as Array<{ label: string; page: CmdPage; icon: React.ReactNode }>).filter((n) => !q || n.label.toLowerCase().includes(q));
              const productMatches = q.length >= 2
                ? (productsQ.data ?? []).filter((p) => p.active && (p.name.toLowerCase().includes(q) || p.articleNumber.toLowerCase().includes(q))).slice(0, 5)
                : [];
              if (navItems.length === 0 && productMatches.length === 0) {
                return (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">No results for &quot;{cmdQuery}&quot;</Typography>
                  </Box>
                );
              }
              return (
                <>
                  {navItems.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
                        Navigation
                      </Typography>
                      {navItems.map((n) => (
                        <Box
                          key={n.page}
                          onClick={() => { setPage(n.page); setCmdOpen(false); }}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, bgcolor: page === n.page ? 'action.selected' : 'transparent' }}
                        >
                          {n.icon}
                          <Typography variant="body2">{n.label}</Typography>
                          {page === n.page && <Chip label={t('youAreHere')} size="small" sx={{ ml: 'auto', fontSize: '0.6rem', height: 18 }} />}
                        </Box>
                      ))}
                    </>
                  )}
                  {productMatches.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
                        Products
                      </Typography>
                      {productMatches.map((p) => (
                        <Box
                          key={p.id}
                          onClick={() => { setPage('products'); setCmdOpen(false); }}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <InventoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>{p.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.articleNumber}</Typography>
                          </Box>
                          <Chip
                            label={p.stock}
                            size="small"
                            color={p.stock === 0 ? 'error' : p.reorderLevel != null && p.stock <= p.reorderLevel ? 'warning' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', fontWeight: 700 }}
                          />
                        </Box>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </Box>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={Boolean(snack)}
          autoHideDuration={4000}
          onClose={() => setSnack(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={snack?.severity ?? 'success'}
            onClose={() => setSnack(null)}
            sx={{ width: '100%' }}
            icon={snack?.severity === 'warning' ? <WarningIcon /> : undefined}
          >
            {snack?.msg}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

// ─── Root export with QueryClientProvider ─────────────────────────────────────

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
}
