'use client';

/**
 * WMS Enterprise Dashboard — page.tsx
 *
 * Single-file Next.js page powering the full Warehouse Management System UI.
 * Constraints: only this file + useWmsQueries.ts may change, no new npm packages.
 *
 * Features:
 *  • Dark / Light theme toggle (persisted in localStorage, hydration-safe)
 *  • Centralised RBAC permissions map (typed, role-aware)
 *  • Role-based sidebar: ADMIN=all, WAREHOUSE_MANAGER=no audit, STAFF=movements+products only
 *  • STAFF: hide financial data, edit/delete, admin features
 *  • Supplier table: computed product-count column
 *  • Movement reverse button + confirmation dialog
 *  • Low-stock Snackbar notification (session-scoped, shown once per login)
 *  • Movement trend chart — pure SVG from real movement data
 *  • i18n: en / tr / de — all strings via t()
 *  • Loading skeletons, improved empty states, RFC-7807 error display
 *  • performedBy (User) column in movements table
 *  • Stock report with KPI summary cards
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Delete as DeleteIcon,
  DarkMode as DarkModeIcon,
  Edit as EditIcon,
  ErrorOutline as ErrorIcon,
  ExpandLess,
  ExpandMore,
  Inventory as InventoryIcon,
  Language as LanguageIcon,
  LightMode as LightModeIcon,
  LocalShipping as LocalShippingIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  NotificationsActive as NotificationsIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  SwapVert as SwapVertIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Undo as UndoIcon,
  Warning as WarningIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useMovements,
  useRecordMovement,
  useReverseMovement,
  useStockReport,
  useAuditLog,
  type Product,
  type Supplier,
  type StockMovement,
  type AuditEntry,
  type StockReport,
  type AuditFilters,
} from '../hooks/useWmsQueries';

// ─── i18n ───────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    appTitle: 'Warehouse Management System',
    dashboard: 'Dashboard',
    products: 'Products',
    suppliers: 'Suppliers',
    movements: 'Movements',
    stockReport: 'Stock Report',
    auditLog: 'Audit Log',
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    search: 'Search',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    loading: 'Loading…',
    error: 'Error',
    noData: 'No data',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    all: 'All',
    total: 'Total',
    name: 'Name',
    description: 'Description',
    articleNumber: 'Article No.',
    unitPrice: 'Unit Price',
    stock: 'Stock',
    reorderLevel: 'Reorder Level',
    supplier: 'Supplier',
    contactPerson: 'Contact Person',
    email: 'Email',
    phone: 'Phone',
    companyName: 'Company Name',
    product: 'Product',
    quantity: 'Quantity',
    type: 'Type',
    date: 'Date',
    user: 'User',
    cost: 'Cost',
    unitCost: 'Unit Cost',
    stockIn: 'Stock In',
    stockOut: 'Stock Out',
    totalValue: 'Total Value',
    currentStock: 'Current Stock',
    lowStock: 'Low Stock',
    actions: 'Actions',
    deleteConfirm: 'Are you sure you want to delete',
    deleteWarning: 'This action cannot be undone.',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    addSupplier: 'Add Supplier',
    editSupplier: 'Edit Supplier',
    recordMovement: 'Record Movement',
    reverseMovement: 'Reverse Movement',
    reverseConfirm: 'Are you sure you want to reverse this movement?',
    reverseWarning: 'This will create a compensating movement and adjust stock levels.',
    reasonCode: 'Reason Code',
    reasonCodeRequired: 'Reason code is required',
    productCount: 'Products',
    stockAfter: 'Stock After',
    totalIn: 'Total In',
    totalOut: 'Total Out',
    fifoValue: 'FIFO Value',
    isLowStock: 'Low Stock',
    entityType: 'Entity Type',
    action: 'Action',
    ipAddress: 'IP Address',
    from: 'From',
    to: 'To',
    filter: 'Filter',
    clearFilters: 'Clear Filters',
    page: 'Page',
    rowsPerPage: 'Rows per page',
    movementTrend: 'Movement Trend (Last 30 Days)',
    quickActions: 'Quick Actions',
    inboundDelivery: 'Inbound Delivery',
    outboundPickup: 'Outbound Pickup',
    viewProducts: 'View Products',
    lowStockAlert: 'Low stock detected',
    lowStockAlertMsg: 'products are below reorder level.',
    noProducts: 'No products yet',
    noProductsMsg: 'Add your first product to get started.',
    noSuppliers: 'No suppliers yet',
    noSuppliersMsg: 'Add your first supplier to get started.',
    noMovements: 'No movements yet',
    noMovementsMsg: 'Record your first stock movement to get started.',
    noReport: 'No report data',
    noReportMsg: 'Add products and record movements to see stock analytics.',
    noAudit: 'No audit events yet',
    noAuditMsg: 'User actions will appear here as they occur.',
    demoCredentials: 'Demo credentials',
    signingIn: 'Signing in…',
    lastMovements: 'Last Movements',
    recentMovements: 'Recent Movements',
    idempotencyKey: 'Idempotency Key (optional)',
    roleAdmin: 'Administrator',
    roleWarehouseManager: 'Warehouse Manager',
    roleStaff: 'Staff',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    kpiTotalProducts: 'Total Products',
    kpiActiveProducts: 'Active Products',
    kpiLowStock: 'Low Stock Items',
    kpiTotalMovements: 'Total Movements',
    kpiIn: 'IN',
    kpiOut: 'OUT',
    kpiTotalStockValue: 'Total Stock Value',
    active_products: 'Active',
    inactive_products: 'Inactive',
    supplier_optional: 'Supplier (optional)',
    language: 'Language',
  },
  tr: {
    appTitle: 'Depo Yönetim Sistemi',
    dashboard: 'Panel',
    products: 'Ürünler',
    suppliers: 'Tedarikçiler',
    movements: 'Hareketler',
    stockReport: 'Stok Raporu',
    auditLog: 'Denetim Günlüğü',
    login: 'Giriş',
    logout: 'Çıkış',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    search: 'Ara',
    add: 'Ekle',
    edit: 'Düzenle',
    delete: 'Sil',
    save: 'Kaydet',
    cancel: 'İptal',
    confirm: 'Onayla',
    close: 'Kapat',
    yes: 'Evet',
    no: 'Hayır',
    loading: 'Yükleniyor…',
    error: 'Hata',
    noData: 'Veri yok',
    status: 'Durum',
    active: 'Aktif',
    inactive: 'Pasif',
    all: 'Tümü',
    total: 'Toplam',
    name: 'Ad',
    description: 'Açıklama',
    articleNumber: 'Makale No.',
    unitPrice: 'Birim Fiyat',
    stock: 'Stok',
    reorderLevel: 'Yeniden Sipariş',
    supplier: 'Tedarikçi',
    contactPerson: 'İletişim Kişisi',
    email: 'E-posta',
    phone: 'Telefon',
    companyName: 'Şirket Adı',
    product: 'Ürün',
    quantity: 'Miktar',
    type: 'Tür',
    date: 'Tarih',
    user: 'Kullanıcı',
    cost: 'Maliyet',
    unitCost: 'Birim Maliyet',
    stockIn: 'Giriş',
    stockOut: 'Çıkış',
    totalValue: 'Toplam Değer',
    currentStock: 'Mevcut Stok',
    lowStock: 'Düşük Stok',
    actions: 'İşlemler',
    deleteConfirm: 'Silmek istediğinizden emin misiniz?',
    deleteWarning: 'Bu işlem geri alınamaz.',
    addProduct: 'Ürün Ekle',
    editProduct: 'Ürün Düzenle',
    addSupplier: 'Tedarikçi Ekle',
    editSupplier: 'Tedarikçi Düzenle',
    recordMovement: 'Hareket Kaydet',
    reverseMovement: 'Hareketi Geri Al',
    reverseConfirm: 'Bu hareketi geri almak istediğinizden emin misiniz?',
    reverseWarning: 'Bu, stok seviyelerini ayarlayan bir telafi hareketi oluşturacaktır.',
    reasonCode: 'Sebep Kodu',
    reasonCodeRequired: 'Sebep kodu zorunludur',
    productCount: 'Ürünler',
    stockAfter: 'Sonraki Stok',
    totalIn: 'Toplam Giriş',
    totalOut: 'Toplam Çıkış',
    fifoValue: 'FIFO Değer',
    isLowStock: 'Düşük Stok',
    entityType: 'Varlık Türü',
    action: 'Eylem',
    ipAddress: 'IP Adresi',
    from: 'Başlangıç',
    to: 'Bitiş',
    filter: 'Filtre',
    clearFilters: 'Filtreleri Temizle',
    page: 'Sayfa',
    rowsPerPage: 'Sayfa başına satır',
    movementTrend: 'Hareket Trendi (Son 30 Gün)',
    quickActions: 'Hızlı İşlemler',
    inboundDelivery: 'Gelen Teslimat',
    outboundPickup: 'Giden Teslimat',
    viewProducts: 'Ürünleri Görüntüle',
    lowStockAlert: 'Düşük stok tespit edildi',
    lowStockAlertMsg: 'ürün yeniden sipariş seviyesinin altında.',
    noProducts: 'Henüz ürün yok',
    noProductsMsg: 'Başlamak için ilk ürününüzü ekleyin.',
    noSuppliers: 'Henüz tedarikçi yok',
    noSuppliersMsg: 'Başlamak için ilk tedarikçinizi ekleyin.',
    noMovements: 'Henüz hareket yok',
    noMovementsMsg: 'Başlamak için ilk stok hareketini kaydedin.',
    noReport: 'Rapor verisi yok',
    noReportMsg: 'Stok analizlerini görmek için ürün ekleyin ve hareketleri kaydedin.',
    noAudit: 'Henüz denetim olayı yok',
    noAuditMsg: 'Kullanıcı işlemleri gerçekleştikçe burada görünecek.',
    demoCredentials: 'Demo kimlik bilgileri',
    signingIn: 'Giriş yapılıyor…',
    lastMovements: 'Son Hareketler',
    recentMovements: 'Son Hareketler',
    idempotencyKey: 'İdempotans Anahtarı (isteğe bağlı)',
    roleAdmin: 'Yönetici',
    roleWarehouseManager: 'Depo Müdürü',
    roleStaff: 'Personel',
    themeLight: 'Açık Tema',
    themeDark: 'Koyu Tema',
    kpiTotalProducts: 'Toplam Ürün',
    kpiActiveProducts: 'Aktif Ürün',
    kpiLowStock: 'Düşük Stok',
    kpiTotalMovements: 'Toplam Hareket',
    kpiIn: 'GİRİŞ',
    kpiOut: 'ÇIKIŞ',
    kpiTotalStockValue: 'Toplam Stok Değeri',
    active_products: 'Aktif',
    inactive_products: 'Pasif',
    supplier_optional: 'Tedarikçi (isteğe bağlı)',
    language: 'Dil',
  },
  de: {
    appTitle: 'Lagerverwaltungssystem',
    dashboard: 'Dashboard',
    products: 'Produkte',
    suppliers: 'Lieferanten',
    movements: 'Bewegungen',
    stockReport: 'Bestandsbericht',
    auditLog: 'Prüfprotokoll',
    login: 'Anmelden',
    logout: 'Abmelden',
    username: 'Benutzername',
    password: 'Passwort',
    search: 'Suche',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    close: 'Schließen',
    yes: 'Ja',
    no: 'Nein',
    loading: 'Laden…',
    error: 'Fehler',
    noData: 'Keine Daten',
    status: 'Status',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    all: 'Alle',
    total: 'Gesamt',
    name: 'Name',
    description: 'Beschreibung',
    articleNumber: 'Artikel-Nr.',
    unitPrice: 'Stückpreis',
    stock: 'Bestand',
    reorderLevel: 'Nachbestellpunkt',
    supplier: 'Lieferant',
    contactPerson: 'Kontaktperson',
    email: 'E-Mail',
    phone: 'Telefon',
    companyName: 'Firmenname',
    product: 'Produkt',
    quantity: 'Menge',
    type: 'Typ',
    date: 'Datum',
    user: 'Benutzer',
    cost: 'Kosten',
    unitCost: 'Stückkosten',
    stockIn: 'Wareneingang',
    stockOut: 'Warenausgang',
    totalValue: 'Gesamtwert',
    currentStock: 'Aktueller Bestand',
    lowStock: 'Niedriger Bestand',
    actions: 'Aktionen',
    deleteConfirm: 'Sind Sie sicher, dass Sie löschen möchten?',
    deleteWarning: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    addProduct: 'Produkt hinzufügen',
    editProduct: 'Produkt bearbeiten',
    addSupplier: 'Lieferant hinzufügen',
    editSupplier: 'Lieferant bearbeiten',
    recordMovement: 'Bewegung erfassen',
    reverseMovement: 'Bewegung umkehren',
    reverseConfirm: 'Sind Sie sicher, dass Sie diese Bewegung umkehren möchten?',
    reverseWarning: 'Dies erstellt eine Ausgleichsbewegung und passt die Lagerbestände an.',
    reasonCode: 'Grundcode',
    reasonCodeRequired: 'Grundcode ist erforderlich',
    productCount: 'Produkte',
    stockAfter: 'Bestand danach',
    totalIn: 'Gesamt Eingang',
    totalOut: 'Gesamt Ausgang',
    fifoValue: 'FIFO Wert',
    isLowStock: 'Niedriger Bestand',
    entityType: 'Entitätstyp',
    action: 'Aktion',
    ipAddress: 'IP-Adresse',
    from: 'Von',
    to: 'Bis',
    filter: 'Filter',
    clearFilters: 'Filter löschen',
    page: 'Seite',
    rowsPerPage: 'Zeilen pro Seite',
    movementTrend: 'Bewegungstrend (Letzte 30 Tage)',
    quickActions: 'Schnellaktionen',
    inboundDelivery: 'Wareneingang',
    outboundPickup: 'Warenausgang',
    viewProducts: 'Produkte anzeigen',
    lowStockAlert: 'Niedriger Bestand erkannt',
    lowStockAlertMsg: 'Produkte unter dem Nachbestellpunkt.',
    noProducts: 'Noch keine Produkte',
    noProductsMsg: 'Fügen Sie Ihr erstes Produkt hinzu, um zu beginnen.',
    noSuppliers: 'Noch keine Lieferanten',
    noSuppliersMsg: 'Fügen Sie Ihren ersten Lieferanten hinzu, um zu beginnen.',
    noMovements: 'Noch keine Bewegungen',
    noMovementsMsg: 'Erfassen Sie Ihre erste Lagerbewegung, um zu beginnen.',
    noReport: 'Keine Berichtsdaten',
    noReportMsg: 'Fügen Sie Produkte hinzu und erfassen Sie Bewegungen, um Lageranalysen zu sehen.',
    noAudit: 'Noch keine Prüfereignisse',
    noAuditMsg: 'Benutzeraktionen werden hier angezeigt, sobald sie auftreten.',
    demoCredentials: 'Demo-Anmeldedaten',
    signingIn: 'Anmelden…',
    lastMovements: 'Letzte Bewegungen',
    recentMovements: 'Letzte Bewegungen',
    idempotencyKey: 'Idempotenzschlüssel (optional)',
    roleAdmin: 'Administrator',
    roleWarehouseManager: 'Lagerleiter',
    roleStaff: 'Mitarbeiter',
    themeLight: 'Helles Design',
    themeDark: 'Dunkles Design',
    kpiTotalProducts: 'Produkte gesamt',
    kpiActiveProducts: 'Aktive Produkte',
    kpiLowStock: 'Niedriger Bestand',
    kpiTotalMovements: 'Bewegungen gesamt',
    kpiIn: 'EIN',
    kpiOut: 'AUS',
    kpiTotalStockValue: 'Gesamter Lagerwert',
    active_products: 'Aktiv',
    inactive_products: 'Inaktiv',
    supplier_optional: 'Lieferant (optional)',
    language: 'Sprache',
  },
} as const;

type Lang = keyof typeof TRANSLATIONS;
type TKey = keyof typeof TRANSLATIONS.en;

const LANG_FLAGS: Record<Lang, string> = { en: '🇬🇧', tr: '🇹🇷', de: '🇩🇪' };
const LANG_KEY = 'wms_lang';
const THEME_KEY = 'wms_theme';
const LOW_STOCK_NOTIF_KEY = 'wms_low_stock_notified';

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 230;
const DRAWER_COLLAPSED_WIDTH = 64;
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

const formatCurrency = (v?: number | null, lang: Lang = 'en') =>
  v == null
    ? '—'
    : new Intl.NumberFormat(lang === 'de' ? 'de-DE' : lang === 'tr' ? 'tr-TR' : 'en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(v);

// ─── RBAC ────────────────────────────────────────────────────────────────────

type WmsRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF';

interface Permissions {
  canWrite: boolean;
  canSeeAudit: boolean;
  canSeeFinancials: boolean;
  canReverseMovements: boolean;
  canManageSuppliers: boolean;
  canSeeProductEdit: boolean;
  canSeeSupplierSection: boolean;
  canSeeReportSection: boolean;
  canSeeMovementCost: boolean;
}

const PERMISSIONS: Record<WmsRole, Permissions> = {
  ADMIN: {
    canWrite: true,
    canSeeAudit: true,
    canSeeFinancials: true,
    canReverseMovements: true,
    canManageSuppliers: true,
    canSeeProductEdit: true,
    canSeeSupplierSection: true,
    canSeeReportSection: true,
    canSeeMovementCost: true,
  },
  WAREHOUSE_MANAGER: {
    canWrite: true,
    canSeeAudit: false,
    canSeeFinancials: true,
    canReverseMovements: false,
    canManageSuppliers: false,
    canSeeProductEdit: false,
    canSeeSupplierSection: true,
    canSeeReportSection: true,
    canSeeMovementCost: true,
  },
  STAFF: {
    canWrite: false,
    canSeeAudit: false,
    canSeeFinancials: false,
    canReverseMovements: false,
    canManageSuppliers: false,
    canSeeProductEdit: false,
    canSeeSupplierSection: false,
    canSeeReportSection: false,
    canSeeMovementCost: false,
  },
};

function normalizeRole(raw: string | undefined): WmsRole {
  const r = (raw ?? '').replace(/^ROLE_/i, '').toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'WAREHOUSE_MANAGER') return 'WAREHOUSE_MANAGER';
  if (r === 'STAFF') return 'STAFF';
  return 'STAFF';
}

// ─── Query Client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

// ─── Helper Components ────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

function KpiCard({ label, value, icon, color = 'primary.main', subtitle }: KpiCardProps) {
  // Map color tokens to hex for gradients
  const gradMap: Record<string, [string, string]> = {
    'primary.main':  ['#6366f1', '#818cf8'],
    'success.main':  ['#10b981', '#34d399'],
    'warning.main':  ['#f59e0b', '#fbbf24'],
    'error.main':    ['#ef4444', '#f87171'],
    'info.main':     ['#3b82f6', '#60a5fa'],
  };
  const [g1, g2] = gradMap[color] ?? ['#6366f1', '#818cf8'];
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.8) 100%)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 30px ${g1}33` },
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, ${g1}, ${g2})`,
        },
        minWidth: 0,
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
            {label}
          </Typography>
          <Typography variant="h3" fontWeight={800} lineHeight={1.1} sx={{ mt: 0.5, mb: 0.5, fontVariantNumeric: 'tabular-nums', background: `linear-gradient(135deg, ${g1}, ${g2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
        <Box sx={{
          width: 52, height: 52, borderRadius: 2.5, flexShrink: 0,
          background: `linear-gradient(135deg, ${g1}, ${g2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: `0 4px 16px ${g1}55`,
          '& svg': { fontSize: 26 },
        }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        gap: 1.5,
        color: 'text.secondary',
      }}
    >
      <Box sx={{ fontSize: 56, opacity: 0.3, lineHeight: 1 }}>{icon}</Box>
      <Typography variant="h6" color="text.primary" fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="body2" textAlign="center" sx={{ maxWidth: 320 }}>
        {message}
      </Typography>
      {action}
    </Box>
  );
}

function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton animation="wave" height={24} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Pie / Donut Chart (pure SVG, hover-scale slices) ───────────────────────

interface PieSlice { label: string; value: number; color: string; }

function PieChart({ slices, size = 180, donut = false, title }: {
  slices: PieSlice[]; size?: number; donut?: boolean; title?: string;
}) {
  const [hovIdx, setHovIdx] = React.useState<number | null>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;
  const cx = size / 2; const cy = size / 2;
  const r = size / 2 - 14;
  const inner = donut ? r * 0.54 : 0;
  let angle = -Math.PI / 2;
  const paths = slices.map((sl, idx) => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const midAngle = angle + sweep / 2;
    const push = hovIdx === idx ? 8 : 0;
    const ox = push * Math.cos(midAngle);
    const oy = push * Math.sin(midAngle);
    const x1 = cx + ox + r * Math.cos(angle);
    const y1 = cy + oy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + ox + r * Math.cos(angle);
    const y2 = cy + oy + r * Math.sin(angle);
    const xi1 = cx + ox + inner * Math.cos(angle - sweep);
    const yi1 = cy + oy + inner * Math.sin(angle - sweep);
    const xi2 = cx + ox + inner * Math.cos(angle);
    const yi2 = cy + oy + inner * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = donut
      ? `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large},0 ${xi1},${yi1} Z`
      : `M${cx + ox},${cy + oy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
    return { ...sl, d, pct: Math.round((sl.value / total) * 100), midAngle };
  });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {title && (
        <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.1em', fontSize: '0.65rem' }}>
          {title}
        </Typography>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          {paths.map((p, i) => (
            <filter key={i} id={`ps${i}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={hovIdx === i ? '4' : '0'} result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          ))}
        </defs>
        {paths.map((p, i) => (
          <path
            key={i} d={p.d} fill={p.color}
            stroke="transparent" strokeWidth={3}
            filter={`url(#ps${i})`}
            opacity={hovIdx === null ? 0.9 : hovIdx === i ? 1 : 0.55}
            style={{ transition: 'opacity 0.2s, filter 0.2s', cursor: 'pointer' }}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
          >
            <title>{`${p.label}: ${p.value} (${p.pct}%)`}</title>
          </path>
        ))}
        {donut && hovIdx === null && (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight="800" fill="currentColor">{total.toLocaleString()}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.45} letterSpacing="2">TOPLAM</text>
          </>
        )}
        {donut && hovIdx !== null && (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize={20} fontWeight="800" fill={paths[hovIdx].color}>{paths[hovIdx].value.toLocaleString()}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={paths[hovIdx].color} opacity={0.8}>{paths[hovIdx].pct}%</text>
          </>
        )}
      </svg>
      <Stack spacing={0.75} sx={{ width: '100%' }}>
        {paths.map((p, i) => (
          <Stack
            key={i} direction="row" alignItems="center" justifyContent="space-between"
            onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}
            sx={{ cursor: 'default', opacity: hovIdx === null || hovIdx === i ? 1 : 0.45, transition: 'opacity 0.2s', borderRadius: 1, px: 0.5, py: 0.25, bgcolor: hovIdx === i ? 'action.hover' : 'transparent' }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color, flexShrink: 0, boxShadow: hovIdx === i ? `0 0 6px ${p.color}` : 'none', transition: 'box-shadow 0.2s' }} />
              <Typography variant="caption" color="text.secondary">{p.label}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography variant="caption" fontWeight={700}>{p.value.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>({p.pct}%)</Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Movement Trend Chart (area chart, Stripe/Linear style) ─────────────────

interface TrendProps {
  movements: StockMovement[];
  lang: Lang;
}

function MovementTrendChart({ movements, lang }: TrendProps) {
  const [hovIdx, setHovIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const now = new Date();
    const loc = lang === 'de' ? 'de-DE' : lang === 'tr' ? 'tr-TR' : 'en-US';
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const dayStr = d.toISOString().slice(0, 10);
      const inQty = movements.filter(m => m.occurredAt.slice(0, 10) === dayStr && m.movementType === 'IN').reduce((s, m) => s + m.quantity, 0);
      const outQty = movements.filter(m => m.occurredAt.slice(0, 10) === dayStr && m.movementType === 'OUT').reduce((s, m) => s + m.quantity, 0);
      return {
        label: d.toLocaleDateString(loc, { month: 'short', day: 'numeric' }),
        in: inQty,
        out: outQty,
        net: inQty - outQty,
      };
    });
  }, [movements, lang]);

  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)), 1);
  const W = 800; const H = 210;
  const PL = 44; const PR = 16; const PT = 20; const PB = 36;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const N = data.length;
  const xOf = (i: number) => PL + (i / (N - 1)) * plotW;
  const yOf = (v: number) => PT + plotH - (v / maxVal) * plotH;
  const labelEvery = Math.ceil(N / 7);
  const GRIDS = 4;

  const buildPath = (vals: number[]) => {
    const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]; const c = pts[i];
      const cpx = ((p.x + c.x) / 2).toFixed(2);
      d += ` C ${cpx} ${p.y.toFixed(2)} ${cpx} ${c.y.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
    }
    return d;
  };

  const buildArea = (vals: number[]) => `${buildPath(vals)} L ${xOf(N - 1).toFixed(2)} ${(PT + plotH).toFixed(2)} L ${xOf(0).toFixed(2)} ${(PT + plotH).toFixed(2)} Z`;

  const inPath = buildPath(data.map(d => d.in));
  const outPath = buildPath(data.map(d => d.out));
  const inArea = buildArea(data.map(d => d.in));
  const outArea = buildArea(data.map(d => d.out));

  const hov = hovIdx !== null ? data[hovIdx] : null;
  const hovX = hovIdx !== null ? xOf(hovIdx) : null;
  const ttW = 88; const ttH = 56;

  return (
    <Box sx={{ overflowX: 'auto', mx: -1 }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', minWidth: 420, cursor: 'crosshair' }}
        aria-label="Movement trend chart"
        onMouseLeave={() => setHovIdx(null)}
        onMouseMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((svgX - PL) / plotW) * (N - 1));
          setHovIdx(Math.max(0, Math.min(N - 1, idx)));
        }}
      >
        <defs>
          <linearGradient id="areaGradIn2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01"/>
          </linearGradient>
          <linearGradient id="areaGradOut2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01"/>
          </linearGradient>
          <filter id="dotGlow2" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="chartClip2">
            <rect x={PL} y={PT} width={plotW} height={plotH + 1}/>
          </clipPath>
        </defs>

        {/* Grid lines + Y labels */}
        {Array.from({ length: GRIDS + 1 }, (_, gi) => {
          const y = PT + (plotH / GRIDS) * gi;
          const val = Math.round(maxVal - (maxVal / GRIDS) * gi);
          return (
            <g key={gi}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="currentColor"
                strokeOpacity={gi === GRIDS ? 0.2 : 0.06}
                strokeWidth={1}/>
              <text x={PL - 7} y={y + 4} fontSize={9} textAnchor="end"
                fill="currentColor" fillOpacity={0.38}
                fontFamily="ui-monospace,monospace">{val}</text>
            </g>
          );
        })}

        {/* Area fills */}
        <g clipPath="url(#chartClip2)">
          <path d={inArea} fill="url(#areaGradIn2)"/>
          <path d={outArea} fill="url(#areaGradOut2)"/>
          <path d={inPath} fill="none" stroke="#10b981" strokeWidth={2.2}
            strokeLinejoin="round" strokeLinecap="round"
            style={{ transition: 'opacity 0.15s' }}
            opacity={hov ? 0.5 : 1}/>
          <path d={outPath} fill="none" stroke="#ef4444" strokeWidth={2.2}
            strokeLinejoin="round" strokeLinecap="round"
            style={{ transition: 'opacity 0.15s' }}
            opacity={hov ? 0.5 : 1}/>
        </g>

        {/* Hover elements */}
        {hovX !== null && hov && (() => {
          const ttX = hovX + 12 + ttW > W - PR ? hovX - ttW - 12 : hovX + 12;
          const ttY = PT + 2;
          const net = hov.net;
          return (
            <g>
              {/* Crosshair line */}
              <line x1={hovX} y1={PT} x2={hovX} y2={PT + plotH}
                stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="4,3"/>

              {/* IN dot */}
              <circle cx={hovX} cy={yOf(hov.in)} r={6} fill="#10b981" filter="url(#dotGlow2)" opacity={0.6}/>
              <circle cx={hovX} cy={yOf(hov.in)} r={4} fill="#10b981"/>
              <circle cx={hovX} cy={yOf(hov.in)} r={2} fill="white"/>

              {/* OUT dot */}
              <circle cx={hovX} cy={yOf(hov.out)} r={6} fill="#ef4444" filter="url(#dotGlow2)" opacity={0.6}/>
              <circle cx={hovX} cy={yOf(hov.out)} r={4} fill="#ef4444"/>
              <circle cx={hovX} cy={yOf(hov.out)} r={2} fill="white"/>

              {/* Tooltip */}
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={7}
                fill="#0c0e14" fillOpacity={0.94}
                stroke="rgba(255,255,255,0.09)" strokeWidth={1}/>
              <text x={ttX + 10} y={ttY + 15} fontSize={9.5}
                fill="rgba(255,255,255,0.45)" fontFamily="system-ui,sans-serif">
                {data[hovIdx!].label}
              </text>
              {/* IN row */}
              <circle cx={ttX + 12} cy={ttY + 28} r={4} fill="#10b981"/>
              <text x={ttX + 21} y={ttY + 32} fontSize={10} fill="#10b981"
                fontWeight="700" fontFamily="ui-monospace,monospace">+{hov.in}</text>
              {/* OUT row */}
              <circle cx={ttX + 12} cy={ttY + 44} r={4} fill="#ef4444"/>
              <text x={ttX + 21} y={ttY + 48} fontSize={10} fill="#ef4444"
                fontWeight="700" fontFamily="ui-monospace,monospace">-{hov.out}</text>
              {/* Net badge */}
              <text x={ttX + ttW - 8} y={ttY + 40} fontSize={10} textAnchor="end"
                fill={net >= 0 ? '#10b981' : '#ef4444'}
                fontWeight="800" fontFamily="ui-monospace,monospace">
                {net >= 0 ? '+' : ''}{net}
              </text>
            </g>
          );
        })()}

        {/* X axis labels */}
        {data.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={xOf(i)} y={H - 8} fontSize={9} textAnchor="middle"
            fill="currentColor" fillOpacity={0.35}
            fontFamily="system-ui,sans-serif">{d.label}</text>
        ))}
      </svg>
    </Box>
  );
}

// ─── Main Home Component ──────────────────────────────────────────────────────

function Home() {
  // ── Language ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
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
      if (saved !== null) setDarkMode(saved === 'dark');
      else setDarkMode(prefersDark);
    } catch {
      setDarkMode(prefersDark);
    }
  }, [prefersDark]);

  const isDark = darkMode ?? prefersDark;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
          success: { main: '#10b981' },
          error: { main: '#ef4444' },
          warning: { main: '#f59e0b' },
          background: isDark
            ? { default: '#0f1117', paper: '#1a1d27' }
            : { default: '#f1f5f9', paper: '#ffffff' },
        },
        shape: { borderRadius: 12 },
        typography: { fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif' },
        components: {
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

  // ── Navigation ────────────────────────────────────────────────────────────
  const [page, setPage] = useState<'dashboard' | 'products' | 'suppliers' | 'movements' | 'report' | 'audit'>('dashboard');
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
    idempotencyKey: string;
  }>({ productId: '', movementType: 'IN', quantity: '', unitCost: '', idempotencyKey: '' });
  const [reverseDialog, setReverseDialog] = useState<StockMovement | null>(null);
  const [reverseReasonCode, setReverseReasonCode] = useState('');
  const [reverseReasonError, setReverseReasonError] = useState('');
  const [productDetailDrawer, setProductDetailDrawer] = useState<Product | null>(null);

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

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const recordMovement = useRecordMovement();
  const reverseMovement = useReverseMovement();

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
    const totalIn = movements.filter((m) => m.movementType === 'IN').reduce((s, m) => s + m.quantity, 0);
    const totalOut = movements.filter((m) => m.movementType === 'OUT').reduce((s, m) => s + m.quantity, 0);
    const lowStock = products.filter((p) => p.active && p.reorderLevel != null && p.stock <= p.reorderLevel).length;
    const totalValue = products.reduce((s, p) => s + p.stock * (p.unitPrice ?? 0), 0);
    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.active).length,
      lowStock,
      totalIn,
      totalOut,
      totalValue,
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
        idempotencyKey: movementForm.idempotencyKey || undefined,
      });
      showSnack('Movement recorded');
      setMovementDialog(false);
      setMovementForm({ productId: '', movementType: 'IN', quantity: '', unitCost: '', idempotencyKey: '' });
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

              <Alert severity="info" icon={<PeopleIcon />}>
                <Typography variant="caption" component="div" fontWeight={700} mb={0.5}>
                  {t('demoCredentials')}
                </Typography>
                {[
                  ['admin', 'admin123', 'ADMIN'],
                  ['warehouse', 'warehouse123', 'WAREHOUSE_MANAGER'],
                  ['staff', 'staff123', 'STAFF'],
                ].map(([u, p, r]) => (
                  <Typography key={u} variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                    {u} / {p} — {r}
                  </Typography>
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
            {page === 'dashboard' && (
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {t('dashboard')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                </Stack>

                {/* KPI cards */}
                <Grid container spacing={2}>
                  {[
                    { label: t('kpiTotalProducts'), value: kpiData.totalProducts, icon: <InventoryIcon />, color: 'primary.main' },
                    { label: t('kpiActiveProducts'), value: kpiData.activeProducts, icon: <CheckCircleIcon />, color: 'success.main' },
                    { label: t('kpiLowStock'), value: kpiData.lowStock, icon: <WarningIcon />, color: kpiData.lowStock > 0 ? 'warning.main' : 'success.main' },
                    ...(perms.canSeeFinancials
                      ? [{ label: t('kpiTotalStockValue'), value: formatCurrency(kpiData.totalValue, lang), icon: <AssessmentIcon />, color: 'info.main' }]
                      : []),
                  ].map((kpi, i) => (
                    <Grid item xs={12} sm={6} lg={3} key={i}>
                      <KpiCard label={kpi.label} value={kpi.value} icon={kpi.icon} color={kpi.color} />
                    </Grid>
                  ))}
                </Grid>

                {/* STAFF quick actions */}
                {auth.role === 'STAFF' && (
                  <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>
                      {t('quickActions')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<ArrowUpIcon />}
                        sx={{ flex: 1, py: 2 }}
                        onClick={() => { setMovementForm((f) => ({ ...f, movementType: 'IN' })); setMovementDialog(true); setPage('movements'); }}
                      >
                        {t('inboundDelivery')}
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="large"
                        startIcon={<ArrowDownIcon />}
                        sx={{ flex: 1, py: 2 }}
                        onClick={() => { setMovementForm((f) => ({ ...f, movementType: 'OUT' })); setMovementDialog(true); setPage('movements'); }}
                      >
                        {t('outboundPickup')}
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<InventoryIcon />}
                        sx={{ flex: 1, py: 2 }}
                        onClick={() => setPage('products')}
                      >
                        {t('viewProducts')}
                      </Button>
                    </Stack>
                  </Paper>
                )}

                {/* Movement trend + IN/OUT donut side by side */}
                <Grid container spacing={2} alignItems="stretch">
                  {/* Left: big IN/OUT donut */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(145deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))' : 'linear-gradient(145deg, rgba(99,102,241,0.04), rgba(255,255,255,1))' }}>
                      {allMovementsQ.isLoading ? <Skeleton variant="circular" width={200} height={200} /> : (
                        <PieChart
                          title="Toplam Hareket"
                          donut
                          size={220}
                          slices={[
                            { label: 'Giriş (IN)',  value: (allMovementsQ.data?.content ?? []).filter(m => m.movementType === 'IN').reduce((s,m) => s + m.quantity, 0),  color: '#10b981' },
                            { label: 'Çıkış (OUT)', value: (allMovementsQ.data?.content ?? []).filter(m => m.movementType === 'OUT').reduce((s,m) => s + m.quantity, 0), color: '#ef4444' },
                          ].filter(s => s.value > 0)}
                        />
                      )}
                    </Paper>
                  </Grid>
                  {/* Right: bar chart */}
                  <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%', background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(145deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))' : 'linear-gradient(145deg, rgba(99,102,241,0.04), rgba(255,255,255,1))' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>{t('movementTrend')}</Typography>
                          <Typography variant="caption" color="text.secondary">Giriş/Çıkış hareketleri</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} /><Typography variant="caption" color="text.secondary">IN</Typography></Stack>
                          <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} /><Typography variant="caption" color="text.secondary">OUT</Typography></Stack>
                        </Box>
                      </Stack>
                      {allMovementsQ.isLoading ? (
                        <Skeleton height={200} />
                      ) : (
                        <MovementTrendChart movements={allMovementsQ.data?.content ?? []} lang={lang} />
                      )}
                    </Paper>
                  </Grid>
                </Grid>

                {/* Recent movements */}
                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{t('recentMovements')}</Typography>
                      <Typography variant="caption" color="text.secondary">Son 5 hareket</Typography>
                    </Box>
                  </Stack>
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('product')}</TableCell>
                          <TableCell>{t('type')}</TableCell>
                          <TableCell>{t('quantity')}</TableCell>
                          <TableCell>{t('date')}</TableCell>
                          <TableCell>{t('user')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allMovementsQ.isLoading ? (
                          <SkeletonRows cols={5} rows={3} />
                        ) : (allMovementsQ.data?.content ?? []).slice(0, 5).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <EmptyState
                                icon={<SwapVertIcon sx={{ fontSize: 'inherit' }} />}
                                title={t('noMovements')}
                                message={t('noMovementsMsg')}
                              />
                            </TableCell>
                          </TableRow>
                        ) : (
                          (allMovementsQ.data?.content ?? []).slice(0, 5).map((m) => (
                            <TableRow key={m.id} hover>
                              <TableCell sx={{ fontWeight: 500 }}>{m.productName}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={m.movementType}
                                  color={m.movementType === 'IN' ? 'success' : 'error'}
                                  variant="filled"
                                  sx={{ fontWeight: 700, minWidth: 42 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} color={m.movementType === 'IN' ? 'success.main' : 'error.main'}>
                                  {m.movementType === 'IN' ? '+' : '-'}{m.quantity}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{new Date(m.occurredAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                                  <Typography variant="caption" fontWeight={600}>{m.performedBy}</Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Stack>
            )}

            {/* ════ PRODUCTS ════ */}
            {page === 'products' && (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('products')}
                  </Typography>
                  {perms.canWrite && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProductDialog({})}>
                      {t('addProduct')}
                    </Button>
                  )}
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder={t('search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>{t('filter')}</InputLabel>
                    <Select
                      label={t('filter')}
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value as typeof productFilter)}
                    >
                      <MenuItem value="all">{t('all')}</MenuItem>
                      <MenuItem value="active">{t('active_products')}</MenuItem>
                      <MenuItem value="inactive">{t('inactive_products')}</MenuItem>
                      <MenuItem value="low">{t('lowStock')}</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '60px' }} />
                      <col />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '160px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>ID</TableCell>
                        <TableCell>{t('name')}</TableCell>
                        <TableCell>{t('articleNumber')}</TableCell>
                        <TableCell align="center">{t('stock')}</TableCell>
                        {perms.canSeeFinancials && <TableCell align="center">{t('unitPrice')}</TableCell>}
                        <TableCell>{t('supplier')}</TableCell>
                        <TableCell>{t('active')}</TableCell>
                        {perms.canSeeProductEdit && <TableCell align="center">{t('actions')}</TableCell>}
</TableRow>
                    </TableHead>
                    <TableBody>
                      {productsQ.isLoading ? (
                        <SkeletonRows cols={perms.canSeeProductEdit ? 7 : 6} />
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canSeeProductEdit ? 7 : 6} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<InventoryIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noProducts')}
                              message={t('noProductsMsg')}
                              action={
                                perms.canWrite ? (
                                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProductDialog({})}>
                                    {t('addProduct')}
                                  </Button>
                                ) : undefined
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((p) => (
                          <TableRow
                            key={p.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setProductDetailDrawer(p)}
                          >
                            <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem', fontFamily: 'monospace' }}>{p.id}</TableCell>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                                {p.reorderLevel != null && p.stock <= p.reorderLevel && (
                                  <Chip size="small" label={t('lowStock')} color="warning" />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.articleNumber}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, color: p.reorderLevel != null && p.stock <= p.reorderLevel ? 'warning.main' : 'text.primary' }}>
                              {p.stock}
                            </TableCell>
                            {perms.canSeeFinancials && (
                              <TableCell align="center">{formatCurrency(p.unitPrice, lang)}</TableCell>
                            )}
                            <TableCell>{p.supplier?.companyName ?? '—'}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={p.active ? t('active') : t('inactive')}
                                color={p.active ? 'success' : 'default'}
                                variant={p.active ? 'filled' : 'outlined'}
                                onClick={perms.canSeeProductEdit ? () => updateProduct.mutate({ id: p.id, active: !p.active }) : undefined}
                                sx={perms.canSeeProductEdit ? { cursor: 'pointer', fontWeight: 700 } : { fontWeight: 700 }}
                              />
                            </TableCell>
                            {perms.canSeeProductEdit && (
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                <IconButton size="small" onClick={() => setProductDialog({ ...p })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteProductDialog(p)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Product detail drawer */}
                <Drawer
                  anchor="right"
                  open={Boolean(productDetailDrawer)}
                  onClose={() => setProductDetailDrawer(null)}
                  sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 380 }, p: 0 } }}
                >
                  {productDetailDrawer && (
                    <Stack sx={{ height: '100%' }}>
                      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                            {productDetailDrawer.name}
                          </Typography>
                          <IconButton onClick={() => setProductDetailDrawer(null)}><CloseIcon /></IconButton>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {productDetailDrawer.articleNumber}
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">{t('status')}</Typography>
                            <Chip
                              size="small"
                              label={productDetailDrawer.active ? t('active') : t('inactive')}
                              color={productDetailDrawer.active ? 'success' : 'default'}
                              variant={productDetailDrawer.active ? 'filled' : 'outlined'}
                              onClick={perms.canSeeProductEdit ? () => {
                                updateProduct.mutate({ id: productDetailDrawer.id, active: !productDetailDrawer.active });
                                setProductDetailDrawer((p: any) => p ? { ...p, active: !p.active } : p);
                              } : undefined}
                              sx={perms.canSeeProductEdit ? { cursor: 'pointer', fontWeight: 700 } : { fontWeight: 700 }}
                            />
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{t('stock')}</Typography>
                            <Typography variant="body2" fontWeight={600}>{productDetailDrawer.stock}</Typography>
                          </Stack>
                          {perms.canSeeFinancials && (
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">{t('unitPrice')}</Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(productDetailDrawer.unitPrice, lang)}
                              </Typography>
                            </Stack>
                          )}
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{t('reorderLevel')}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productDetailDrawer.reorderLevel ?? '—'}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{t('supplier')}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productDetailDrawer.supplier?.companyName ?? '—'}
                            </Typography>
                          </Stack>
                          {productDetailDrawer.description && (
                            <Box>
                              <Typography variant="body2" color="text.secondary" mb={0.5}>{t('description')}</Typography>
                              <Typography variant="body2">{productDetailDrawer.description}</Typography>
                            </Box>
                          )}

                          <Divider />
                          <Typography variant="subtitle2" fontWeight={700}>{t('lastMovements')}</Typography>
                          {/* Mini movements list */}
                          {(allMovementsQ.data?.content ?? [])
                            .filter((m) => m.productId === productDetailDrawer.id)
                            .slice(0, 5)
                            .map((m) => (
                              <Stack key={m.id} direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip size="small" label={m.movementType} color={m.movementType === 'IN' ? 'success' : 'error'} variant="outlined" />
                                  <Typography variant="body2">{m.quantity}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(m.occurredAt).toLocaleDateString()}
                                </Typography>
                              </Stack>
                            ))}
                        </Stack>
                      </Box>

                      {perms.canSeeProductEdit && (
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              startIcon={<EditIcon />}
                              fullWidth
                              onClick={() => { setProductDialog({ ...productDetailDrawer }); setProductDetailDrawer(null); }}
                            >
                              {t('edit')}
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              fullWidth
                              onClick={() => { setDeleteProductDialog(productDetailDrawer); setProductDetailDrawer(null); }}
                            >
                              {t('delete')}
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  )}
                </Drawer>
              </Stack>
            )}

            {/* ════ SUPPLIERS ════ */}
            {page === 'suppliers' && perms.canSeeSupplierSection && (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('suppliers')}
                  </Typography>
                  {perms.canManageSuppliers && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSupplierDialog({})}>
                      {t('addSupplier')}
                    </Button>
                  )}
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('companyName')}</TableCell>
                        <TableCell>{t('contactPerson')}</TableCell>
                        <TableCell>{t('email')}</TableCell>
                        <TableCell>{t('phone')}</TableCell>
                        <TableCell align="center">{t('productCount')}</TableCell>
                        {perms.canManageSuppliers && <TableCell sx={{ textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('actions')}</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {suppliersQ.isLoading ? (
                        <SkeletonRows cols={perms.canManageSuppliers ? 6 : 5} />
                      ) : (suppliersQ.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canManageSuppliers ? 6 : 5} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<BusinessIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noSuppliers')}
                              message={t('noSuppliersMsg')}
                              action={
                                perms.canManageSuppliers ? (
                                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSupplierDialog({})}>
                                    {t('addSupplier')}
                                  </Button>
                                ) : undefined
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (suppliersQ.data ?? []).map((s) => (
                          <TableRow key={s.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                  width: 34, height: 34, borderRadius: 2,
                                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                                }}>
                                  {(s.companyName ?? '?').slice(0,2).toUpperCase()}
                                </Box>
                                <Typography variant="body2" fontWeight={600}>{s.companyName}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{s.contactPerson ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'primary.main', fontSize: '0.8rem' }}>{s.email ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{s.phone ?? '—'}</TableCell>
                            <TableCell align="center">
                              <Chip size="small" label={supplierProductCount.get(s.id) ?? 0}
                                color={((supplierProductCount.get(s.id) ?? 0) > 0) ? 'primary' : 'default'}
                                variant={(supplierProductCount.get(s.id) ?? 0) > 0 ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 700, minWidth: 36 }} />
                            </TableCell>
                            {perms.canManageSuppliers && (
                              <TableCell align="center">
                                <IconButton size="small" onClick={() => setSupplierDialog({ ...s })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteSupplierDialog(s)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}

            {/* ════ MOVEMENTS ════ */}
            {page === 'movements' && (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                  <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('movements')}
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setMovementDialog(true)}>
                    {t('recordMovement')}
                  </Button>
                </Stack>

                {/* KPI row */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <KpiCard label={t('kpiIn')} value={kpiData.totalIn} icon={<TrendingUpIcon />} color="success.main" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <KpiCard label={t('kpiOut')} value={kpiData.totalOut} icon={<TrendingDownIcon />} color="error.main" />
                  </Grid>
                  {perms.canSeeMovementCost && (
                    <Grid item xs={12} sm={4}>
                      <KpiCard label={t('kpiTotalStockValue')} value={formatCurrency(kpiData.totalValue, lang)} icon={<AssessmentIcon />} color="primary.main" />
                    </Grid>
                  )}
                </Grid>

                {/* Filter by product */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>{t('product')}</InputLabel>
                    <Select
                      label={t('product')}
                      value={movementProductFilter}
                      onChange={(e) => { setMovementProductFilter(e.target.value as number | ''); setMovementPage(0); }}
                    >
                      <MenuItem value="">{t('all')}</MenuItem>
                      {(productsQ.data ?? []).map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {movementProductFilter !== '' && (
                    <Button variant="outlined" size="small" onClick={() => { setMovementProductFilter(''); setMovementPage(0); }}>
                      {t('clearFilters')}
                    </Button>
                  )}
                </Stack>

                {/* ── Stock Report Pie Charts ── */}
                {reportWithFifo.length > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                        <PieChart
                          title="Toplam Giriş / Çıkış"
                          donut
                          size={200}
                          slices={[
                            { label: t('totalIn'),  value: reportWithFifo.reduce((s,r) => s + r.totalIn,  0), color: '#10b981' },
                            { label: t('totalOut'), value: reportWithFifo.reduce((s,r) => s + r.totalOut, 0), color: '#ef4444' },
                          ].filter(s => s.value > 0)}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                        <PieChart
                          title="Stok Durumu"
                          size={200}
                          slices={[
                            { label: 'Normal Stok', value: reportWithFifo.filter(r => !r.isLowStock).length, color: '#6366f1' },
                            { label: 'Düşük Stok',  value: reportWithFifo.filter(r => r.isLowStock).length,  color: '#f59e0b' },
                          ].filter(s => s.value > 0)}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('product')}</TableCell>
                        <TableCell>{t('type')}</TableCell>
                        <TableCell align="center">{t('quantity')}</TableCell>
                        {perms.canSeeMovementCost && <TableCell align="center">{t('cost')}</TableCell>}
                        <TableCell align="center">{t('stockAfter')}</TableCell>
                        <TableCell>{t('user')}</TableCell>
                        <TableCell>{t('date')}</TableCell>
                        {perms.canReverseMovements && <TableCell sx={{ textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('actions')}</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movementsQ.isLoading ? (
                        <SkeletonRows cols={perms.canReverseMovements ? 8 : 7} />
                      ) : (movementsQ.data?.content ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canReverseMovements ? 8 : 7} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<SwapVertIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noMovements')}
                              message={t('noMovementsMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (movementsQ.data?.content ?? []).map((m) => (
                          <TableRow key={m.id} hover sx={{ opacity: m.reversedById ? 0.5 : 1 }}>
                            <TableCell>{m.productName}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={m.movementType}
                                color={m.movementType === 'IN' ? 'success' : 'error'}
                                variant="outlined"
                              />
                              {m.reversalOfId && (
                                <Chip size="small" label="REV" sx={{ ml: 0.5 }} variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell align="center">{m.quantity}</TableCell>
                            {perms.canSeeMovementCost && (
                              <TableCell align="center">{formatCurrency(m.totalCost, lang)}</TableCell>
                            )}
                            <TableCell align="center">{m.stockAfter}</TableCell>
                            <TableCell>{m.performedBy}</TableCell>
                            <TableCell>{new Date(m.occurredAt).toLocaleString()}</TableCell>
                            {perms.canReverseMovements && (
                              <TableCell align="center">
                                {!m.reversedById && !m.reversalOfId && (
                                  <Tooltip title={t('reverseMovement')}>
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => { setReverseDialog(m); setReverseReasonCode(''); setReverseReasonError(''); }}
                                    >
                                      <UndoIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={movementsQ.data?.totalElements ?? 0}
                    page={movementPage}
                    onPageChange={(_, p) => setMovementPage(p)}
                    rowsPerPage={50}
                    rowsPerPageOptions={[50]}
                    labelRowsPerPage={t('rowsPerPage')}
                  />
                </TableContainer>
              </Stack>
            )}

            {/* ════ STOCK REPORT ════ */}
            {page === 'report' && perms.canSeeReportSection && (
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>{t('stockReport')}</Typography>

                {/* Summary KPI cards */}
                {reportWithFifo.length > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <KpiCard
                        label={t('kpiTotalProducts')}
                        value={reportWithFifo.length}
                        icon={<InventoryIcon />}
                        color="primary.main"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <KpiCard
                        label={t('kpiLowStock')}
                        value={reportWithFifo.filter((r) => r.isLowStock).length}
                        icon={<WarningIcon />}
                        color="warning.main"
                      />
                    </Grid>
                    {perms.canSeeFinancials && (
                      <Grid item xs={12} sm={4}>
                        <KpiCard
                          label={t('fifoValue')}
                          value={formatCurrency(reportWithFifo.reduce((s, r) => s + (r.fifoValue ?? 0), 0), lang)}
                          icon={<AssessmentIcon />}
                          color="success.main"
                        />
                      </Grid>
                    )}
                  </Grid>
                )}

                {/* ── Stock Report Pie Charts ── */}
                {reportWithFifo.length > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                        <PieChart
                          title="Toplam Giriş / Çıkış"
                          donut
                          size={200}
                          slices={[
                            { label: t('totalIn'),  value: reportWithFifo.reduce((s,r) => s + r.totalIn,  0), color: '#10b981' },
                            { label: t('totalOut'), value: reportWithFifo.reduce((s,r) => s + r.totalOut, 0), color: '#ef4444' },
                          ].filter(s => s.value > 0)}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                        <PieChart
                          title="Stok Durumu"
                          size={200}
                          slices={[
                            { label: 'Normal Stok', value: reportWithFifo.filter(r => !r.isLowStock).length, color: '#6366f1' },
                            { label: 'Düşük Stok',  value: reportWithFifo.filter(r => r.isLowStock).length,  color: '#f59e0b' },
                          ].filter(s => s.value > 0)}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('product')}</TableCell>
                        <TableCell>{t('articleNumber')}</TableCell>
                        <TableCell align="center">{t('totalIn')}</TableCell>
                        <TableCell align="center">{t('totalOut')}</TableCell>
                        <TableCell align="center">{t('currentStock')}</TableCell>
                        {perms.canSeeFinancials && <TableCell align="center">{t('fifoValue')}</TableCell>}
                        <TableCell align='right'>{t('isLowStock')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportQ.isLoading ? (
                        <SkeletonRows cols={perms.canSeeFinancials ? 7 : 6} />
                      ) : reportWithFifo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={perms.canSeeFinancials ? 7 : 6} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<AssessmentIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noReport')}
                              message={t('noReportMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportWithFifo.map((r) => (
                          <TableRow key={r.productId} hover>
                            <TableCell>{r.productName}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.articleNumber}</TableCell>
                            <TableCell align="center" sx={{ color: 'success.main', fontWeight: 600 }}>{r.totalIn}</TableCell>
                            <TableCell align="center" sx={{ color: 'error.main', fontWeight: 600 }}>{r.totalOut}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{r.currentStock}</TableCell>
                            {perms.canSeeFinancials && (
                              <TableCell align="center">{formatCurrency(r.fifoValue, lang)}</TableCell>
                            )}
                            <TableCell>
                              {r.isLowStock ? (
                                <Chip size="small" label={t('lowStock')} color="warning" icon={<WarningIcon />} />
                              ) : (
                                <Chip size="small" label="OK" color="success" variant="outlined" icon={<CheckCircleIcon />} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}

            {/* ════ AUDIT LOG ════ */}
            {page === 'audit' && perms.canSeeAudit && (
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>{t('auditLog')}</Typography>

                {/* Audit filters */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                  <TextField
                    select size="small"
                    label={t('entityType')}
                    value={auditFilters.entityType ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
                    sx={{ flex: 1, minWidth: 160 }}
                  >
                    <MenuItem value="">— {t('all')} —</MenuItem>
                    {['User','Product','Supplier','Stock'].map((et) => (
                      <MenuItem key={et} value={et}>{et}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select size="small"
                    label={t('action')}
                    value={auditFilters.action ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, action: e.target.value || undefined }))}
                    sx={{ flex: 1, minWidth: 200 }}
                  >
                    <MenuItem value="">— {t('all')} —</MenuItem>
                    {['USER_LOGIN','USER_LOGOUT','USER_REGISTER','TOKEN_REFRESHED',
                      'PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_DEACTIVATED',
                      'SUPPLIER_CREATED','SUPPLIER_UPDATED','SUPPLIER_DELETED',
                      'STOCK_IN','STOCK_OUT','STOCK_ADJUSTED'].map((a) => (
                      <MenuItem key={a} value={a}>{a.replace(/_/g,' ')}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label={t('from')}
                    type="date"
                    value={auditFilters.from ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, from: e.target.value || undefined }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: 140 }}
                  />
                  <TextField
                    size="small"
                    label={t('to')}
                    type="date"
                    value={auditFilters.to ?? ''}
                    onChange={(e) => setAuditFilters((f) => ({ ...f, to: e.target.value || undefined }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: 140 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => { setAuditFilters({}); setAuditPage(0); }}
                  >
                    {t('clearFilters')}
                  </Button>
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('user')}</TableCell>
                        <TableCell>{t('action')}</TableCell>
                        <TableCell>{t('entityType')}</TableCell>
                        <TableCell>{t('description')}</TableCell>
                        <TableCell>{t('ipAddress')}</TableCell>
                        <TableCell>{t('date')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditQ.isLoading ? (
                        <SkeletonRows cols={6} />
                      ) : (auditQ.data?.content ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 0 }}>
                            <EmptyState
                              icon={<AssignmentIcon sx={{ fontSize: 'inherit' }} />}
                              title={t('noAudit')}
                              message={t('noAuditMsg')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        (auditQ.data?.content ?? []).map((a) => (
                          <TableRow key={a.id} hover>
                            <TableCell>{a.username}</TableCell>
                            <TableCell>
                              <Chip size="small" label={a.action} variant="outlined" />
                            </TableCell>
                            <TableCell>{a.entityType ?? '—'}</TableCell>
                            <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.description ?? '—'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{a.ipAddress ?? '—'}</TableCell>
                            <TableCell>{new Date(a.occurredAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={auditQ.data?.totalElements ?? 0}
                    page={auditPage}
                    onPageChange={(_, p) => setAuditPage(p)}
                    rowsPerPage={25}
                    rowsPerPageOptions={[25]}
                    labelRowsPerPage={t('rowsPerPage')}
                  />
                </TableContainer>
              </Stack>
            )}
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
              <TextField
                label={t('idempotencyKey')}
                value={movementForm.idempotencyKey}
                onChange={(e) => setMovementForm((f) => ({ ...f, idempotencyKey: e.target.value }))}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMovementDialog(false)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleRecordMovement}
              disabled={recordMovement.isPending || !movementForm.productId || !movementForm.quantity}
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



