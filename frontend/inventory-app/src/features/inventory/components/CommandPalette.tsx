'use client';

import React, { useRef, useState } from 'react';
import { Box, Dialog, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, Business as BusinessIcon, History as HistoryIcon, Home as HomeIcon, Inventory as InventoryIcon, Person as PersonIcon, Search as SearchIcon, Settings as SettingsIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { type Product } from '@/hooks/useInventoryQueries';
import { TKey } from '@/features/inventory/i18n';
import { PageId, Permissions, canOpenPage } from '@/features/inventory/permissions';
import { StatusChip } from '@/features/inventory/components/Primitives';

interface CommandPaletteProps {
  t: (key: TKey) => string;
  open: boolean;
  onClose: () => void;
  query: string;
  onQuery: (q: string) => void;
  perms: Permissions;
  page: PageId;
  products: Product[];
  onNavigate: (id: PageId) => void;
  /** Open one product (its detail panel) instead of only the product list. */
  onOpenProduct: (p: Product) => void;
}

const ROW_SX = { display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } } as const;
const HEADING_SX = { px: 2, pt: 1.5, pb: 0.5, display: 'block', letterSpacing: 0, fontSize: '0.75rem' } as const;

/** Ctrl+K: jump to a page or a product. Only offers pages the signed-in role may open. */
export function CommandPalette({ t, open, onClose, query, onQuery, perms, page, products, onNavigate, onOpenProduct }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);
  const q = query.trim().toLowerCase();

  const pages: Array<{ id: PageId; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t('dashboard'), icon: <HomeIcon fontSize="small" /> },
    { id: 'products', label: t('products'), icon: <InventoryIcon fontSize="small" /> },
    { id: 'suppliers', label: t('suppliers'), icon: <BusinessIcon fontSize="small" /> },
    { id: 'movements', label: t('movements'), icon: <SwapHorizIcon fontSize="small" /> },
    { id: 'report', label: t('stockReport'), icon: <AssessmentIcon fontSize="small" /> },
    { id: 'audit', label: t('auditLog'), icon: <HistoryIcon fontSize="small" /> },
    { id: 'users', label: t('userManagement'), icon: <PersonIcon fontSize="small" /> },
    { id: 'settings', label: t('settings'), icon: <SettingsIcon fontSize="small" /> },
  ];
  const pageMatches = pages.filter((p) => canOpenPage(perms, p.id) && (!q || p.label.toLowerCase().includes(q)));
  const productMatches = q.length >= 2
    ? products.filter((p) => p.active && (p.name.toLowerCase().includes(q) || p.articleNumber.toLowerCase().includes(q))).slice(0, 5)
    : [];

  // One flat list so the arrow keys walk through pages and products in the order they are shown.
  const runners: Array<() => void> = [
    ...pageMatches.map((n) => () => onNavigate(n.id)),
    ...productMatches.map((p) => () => onOpenProduct(p)),
  ];
  const active = runners.length ? Math.min(cursor, runners.length - 1) : -1;
  const close = () => { setCursor(0); onClose(); };
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { close(); return; }
    if (!runners.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((active + 1) % runners.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((active - 1 + runners.length) % runners.length); }
    else if (e.key === 'Enter') { e.preventDefault(); runners[active](); close(); }
  };
  const rowSx = (index: number, extra: object = {}) => ({ ...ROW_SX, ...extra, ...(index === active ? { bgcolor: 'action.selected' } : {}) });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" TransitionProps={{ onEntered: () => inputRef.current?.focus() }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <input
          ref={inputRef}
          aria-label={t('cmdPalettePlaceholder')}
          value={query}
          onChange={(e) => { setCursor(0); onQuery(e.target.value); }}
          placeholder={t('cmdPalettePlaceholder')}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 16, flex: 1, minWidth: 0, color: 'inherit', fontFamily: 'inherit' }}
          onKeyDown={handleKey}
        />
      </Box>
      <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
        {pageMatches.length === 0 && productMatches.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">{t('noResults')}</Typography>
          </Box>
        ) : (
          <>
            {pageMatches.map((n, i) => (
              <Box key={n.id} role="option" aria-selected={i === active} onClick={() => { onNavigate(n.id); close(); }} sx={rowSx(i, page === n.id ? { bgcolor: 'action.selected' } : {})}>
                {n.icon}
                <Typography variant="body2">{n.label}</Typography>
                {page === n.id && <Box sx={{ ml: 'auto' }}><StatusChip label={t('youAreHere')} tone="primary" /></Box>}
              </Box>
            ))}
            {productMatches.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={HEADING_SX}>{t('products')}</Typography>
                {productMatches.map((p, i) => (
                  <Box key={p.id} role="option" aria-selected={pageMatches.length + i === active} onClick={() => { onOpenProduct(p); close(); }} sx={rowSx(pageMatches.length + i)}>
                    <InventoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.articleNumber}</Typography>
                    </Box>
                    <StatusChip label={p.stock} tone={p.stock === 0 ? 'error' : p.reorderLevel != null && p.stock <= p.reorderLevel ? 'warning' : 'neutral'} />
                  </Box>
                ))}
              </>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
}
