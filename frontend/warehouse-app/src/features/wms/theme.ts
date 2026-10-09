import { createTheme, type Theme } from '@mui/material/styles';

/**
 * One visual language for the whole app: blue primary, navy sidebar, slate neutrals, white cards
 * with a 1px slate border, and a light top bar with a bottom border. Status colours (green, amber,
 * red) are used only for meaning, never for decoration.
 */
export const BRAND = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#60a5fa',
  navy: '#0b1f3a',
  navyDark: '#071528',
  border: '#e2e8f0',
  pageBg: '#f1f5f9',
  slate50: '#f8fafc',
  slate500: '#64748b',
  slate900: '#0f172a',
} as const;

/**
 * Layout and density tokens. The type scale is fixed here (14px body) so every screen reads the same.
 *   content width : fluid, capped at CONTENT_MAX so tables stay scannable on very wide screens
 *   spacing       : MUI 8px grid; pages use gap 3 (24px) between sections, cards use padding 2.5
 *   table rows    : 14px text, 11px vertical padding (about 44px per row), header 12px caps
 */
export const LAYOUT = {
  contentMax: 1680,
  tableRowPaddingY: 11,
  tableRowPaddingX: 16,
  cardRadius: 12,
} as const;

/** Sidebar colours (the sidebar is navy in light and dark mode). */
export const SIDEBAR = {
  bg: BRAND.navy,
  bgDark: BRAND.navyDark,
  text: 'rgba(255,255,255,0.78)',
  textMuted: 'rgba(255,255,255,0.5)',
  hover: 'rgba(255,255,255,0.07)',
  active: 'rgba(37,99,235,0.28)',
  divider: 'rgba(255,255,255,0.1)',
} as const;

export function createWmsTheme(isDark: boolean): Theme {
  const divider = isDark ? 'rgba(148,163,184,0.18)' : BRAND.border;
  const gridLine = isDark ? 'rgba(148,163,184,0.28)' : '#e2e8f0';
  const colLine = isDark ? 'rgba(148,163,184,0.16)' : '#e2e8f0';
  const rowLine = isDark ? 'rgba(148,163,184,0.14)' : '#eef2f7';
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: BRAND.primary, dark: BRAND.primaryHover, light: BRAND.primaryLight },
      secondary: { main: '#0ea5e9' },
      success: { main: '#16a34a' },
      error: { main: '#dc2626' },
      warning: { main: '#d97706' },
      info: { main: '#0284c7' },
      text: isDark
        ? { primary: '#e2e8f0', secondary: '#94a3b8' }
        : { primary: BRAND.slate900, secondary: BRAND.slate500 },
      divider,
      background: isDark
        ? { default: '#0b1220', paper: '#111a2e' }
        : { default: BRAND.pageBg, paper: '#ffffff' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.3, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.35, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem' },
      subtitle2: { fontWeight: 600, fontSize: '0.875rem' },
      body1: { fontSize: '0.875rem', lineHeight: 1.5 },
      body2: { fontSize: '0.875rem', lineHeight: 1.45 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { overflowX: 'hidden' },
          // visible keyboard focus everywhere (2px ring, offset so it is not clipped by neighbours)
          '*:focus-visible': { outline: `2px solid ${BRAND.primary}`, outlineOffset: '2px' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#111a2e' : '#ffffff',
            backgroundImage: 'none',
            color: isDark ? '#e2e8f0' : BRAND.slate900,
            boxShadow: 'none',
            borderBottom: `1px solid ${divider}`,
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700, fontSize: '1.1rem' } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 6 },
          sizeSmall: { height: 22, fontSize: '0.72rem' },
        },
      },
      // ── Table chrome: tinted sticky header, vertical column dividers, row separators, hover/selected ──
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              position: 'sticky',
              top: 0,
              zIndex: 2,
              backgroundColor: isDark ? '#16213a' : '#f1f5f9',
              color: isDark ? '#cbd5e1' : '#475569',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              borderBottom: `1px solid ${gridLine}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            height: 44,
            backgroundColor: isDark ? '#111a2e' : '#ffffff',
            // very subtle zebra striping
            '&:nth-of-type(even)': { backgroundColor: isDark ? 'rgba(255,255,255,0.018)' : '#fafbfd' },
            '&.MuiTableRow-hover:hover': { backgroundColor: isDark ? 'rgba(96,165,250,0.10)' : '#eff6ff' },
            '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: isDark ? 'rgba(96,165,250,0.16)' : '#dbeafe' },
            '&:last-child td': { borderBottom: 'none' },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: `${LAYOUT.tableRowPaddingY}px ${LAYOUT.tableRowPaddingX}px`,
            fontSize: '0.875rem',
            borderBottom: `1px solid ${rowLine}`,
            // vertical divider between every pair of cells, header included
            '&:not(:last-child)': { borderRight: `1px solid ${colLine}` },
            fontVariantNumeric: 'tabular-nums',
          },
        },
      },
    },
  });
}
