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
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { overflowX: 'hidden' },
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
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : BRAND.slate50,
              color: isDark ? '#94a3b8' : BRAND.slate500,
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              borderBottom: `1px solid ${divider}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : BRAND.slate50,
            },
            '&:last-child td': { borderBottom: 'none' },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '10px 16px',
            borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : '#eef2f7'}`,
            fontVariantNumeric: 'tabular-nums',
          },
        },
      },
    },
  });
}
