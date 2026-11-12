/**
 * Sidebar of the inventory shell: the navigation a role may open, and the signed-in user with logout.
 * It only renders; routing, the account menu and logout stay in InventoryApp.
 */

import React from 'react';
import { Box, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import { Assessment as AssessmentIcon, Assignment as AssignmentIcon, Business as BusinessIcon, Dashboard as DashboardIcon, Inventory as InventoryIcon, LocalShipping as LocalShippingIcon, Logout as LogoutIcon, People as PeopleIcon, Settings as SettingsIcon, SwapVert as SwapVertIcon } from '@mui/icons-material';
import { LAYOUT } from '@/features/inventory/theme';
import { initialsOf } from '@/features/inventory/labels';
import type { TKey } from '@/features/inventory/i18n';
import { PageId, Permissions, canOpenPage } from '@/features/inventory/permissions';

type Props = {
  t: (key: TKey) => string;
  perms: Permissions;
  page: PageId;
  collapsed: boolean;
  username: string;
  roleLabel: string;
  onSelect: (id: PageId) => void;
  onOpenAccount: (anchor: HTMLElement) => void;
  onLogout: () => void;
};

export function AppSidebar({ t, perms, page, collapsed, username, roleLabel, onSelect, onOpenAccount, onLogout }: Props) {
  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t('dashboard'), icon: <DashboardIcon /> },
    { id: 'products', label: t('products'), icon: <InventoryIcon /> },
    { id: 'suppliers', label: t('suppliers'), icon: <BusinessIcon /> },
    { id: 'movements', label: t('movements'), icon: <SwapVertIcon /> },
    { id: 'report', label: t('stockReport'), icon: <AssessmentIcon /> },
    { id: 'audit', label: t('auditLog'), icon: <AssignmentIcon /> },
    { id: 'users', label: t('userManagement'), icon: <PeopleIcon /> },
    { id: 'settings', label: t('settings'), icon: <SettingsIcon /> },
  ];
  const visibleNav = navItems.filter((n) => canOpenPage(perms, n.id));
  const initials = initialsOf(username);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: 'background.paper', color: 'text.primary', borderRight: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ px: collapsed ? 0 : 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 1.5, height: LAYOUT.appBarHeight, flexShrink: 0, overflow: 'hidden', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LocalShippingIcon sx={{ fontSize: 20 }} />
        </Box>
        {!collapsed && <Typography variant="subtitle1" noWrap>Inventory</Typography>}
      </Box>

      <List component="nav" aria-label={t('appTitle')} sx={{ flex: 1, px: 1.5, py: 2, overflowY: 'auto' }}>
        {visibleNav.map((item) => {
          const selected = page === item.id;
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  selected={selected}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => onSelect(item.id)}
                  sx={{
                    borderRadius: '8px', color: 'text.secondary', height: 36, py: 0,
                    justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 0 : 1.5,
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'rgba(53,104,237,0.10)', color: 'primary.main' },
                    '& .MuiListItemIcon-root': { color: 'inherit' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500, noWrap: true, fontSize: '0.875rem' }} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* signed-in user, role and logout: always at the bottom of the sidebar */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box
          component="button" type="button" aria-label={t('account')} onClick={(e: React.MouseEvent<HTMLElement>) => onOpenAccount(e.currentTarget)}
          sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: collapsed ? 'none' : 1, p: 0.5, borderRadius: '8px', '&:hover, &:focus-visible': { bgcolor: 'action.hover' } }}
        >
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(53,104,237,0.12)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </Box>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500} noWrap>{username}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">{roleLabel}</Typography>
            </Box>
          )}
        </Box>
        <Tooltip title={t('logout')} placement={collapsed ? 'right' : 'top'}>
          <IconButton size="small" aria-label={t('logout')} onClick={onLogout}><LogoutIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
