'use client';

import React, { useRef } from 'react';
import { Box, Dialog, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, Business as BusinessIcon, History as HistoryIcon, Home as HomeIcon, Inventory as InventoryIcon, Person as PersonIcon, Search as SearchIcon, Settings as SettingsIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { type Product } from '@/hooks/useWmsQueries';
import { TKey } from '@/features/wms/i18n';
import { PageId, Permissions, canOpenPage } from '@/features/wms/permissions';
import { StatusChip } from '@/features/wms/components/Primitives';

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
}

const ROW_SX = { display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } } as const;
const HEADING_SX = { px: 2, pt: 1.5, pb: 0.5, display: 'block', letterSpacing: 0, fontSize: '0.75rem' } as const;

/** Ctrl+K: jump to a page or a product. Only offers pages the signed-in role may open. */
export function CommandPalette({ t, open, onClose, query, onQuery, perms, page, products, onNavigate }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" TransitionProps={{ onEntered: () => inputRef.current?.focus() }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <input
          ref={inputRef}
          aria-label={t('cmdPalettePlaceholder')}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t('cmdPalettePlaceholder')}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 16, flex: 1, minWidth: 0, color: 'inherit', fontFamily: 'inherit' }}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        />
      </Box>
      <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
        {pageMatches.length === 0 && productMatches.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">{t('noResults')}</Typography>
          </Box>
        ) : (
          <>
            {pageMatches.map((n) => (
              <Box key={n.id} onClick={() => { onNavigate(n.id); onClose(); }} sx={{ ...ROW_SX, bgcolor: page === n.id ? 'action.selected' : 'transparent' }}>
                {n.icon}
                <Typography variant="body2">{n.label}</Typography>
                {page === n.id && <Box sx={{ ml: 'auto' }}><StatusChip label={t('youAreHere')} tone="primary" /></Box>}
              </Box>
            ))}
            {productMatches.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={HEADING_SX}>{t('products')}</Typography>
                {productMatches.map((p) => (
                  <Box key={p.id} onClick={() => { onNavigate('products'); onClose(); }} sx={ROW_SX}>
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
