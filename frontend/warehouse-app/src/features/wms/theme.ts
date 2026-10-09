import { createTheme, type Theme } from '@mui/material/styles';

/**
 * One visual language for the whole app.
 *
 * Palette   : neutral slate greys plus ONE blue accent. Green, amber and red appear only to say
 *             something about status (in stock, low, out, error), never as decoration.
 * Type scale: four sizes only - 12 (meta, table header, pills, helper text), 14 (body, tables, inputs,
 *             buttons), 16 (card and dialog titles) and 24 (page title, metric value).
 *             Weights 400, 500 and 600; nothing heavier.
 * Spacing   : MUI's 8px grid. Page padding 24 (32 on wide screens), 24 between sections, 16 inside
 *             cards, 12 x 16 in table cells (44px rows).
 */
export const BRAND = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#60a5fa',
  border: '#e2e8f0',
  pageBg: '#f8fafc',
  slate500: '#64748b',
  slate900: '#0f172a',
} as const;

export const FONT = { meta: '0.75rem', body: '0.875rem', title: '1rem', display: '1.5rem' } as const;

/**
 * Layout and density tokens.
 *   content width : fluid, capped at contentMax so tables stay scannable on very wide screens
 *   table rows    : 14px text, 12px vertical padding (44px per row), header 12px
 */
export const LAYOUT = {
  contentMax: 1680,
  tableRowPaddingY: 12,
  tableRowPaddingX: 16,
  cardRadius: 8,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 64,
  appBarHeight: 56,
} as const;

export function createWmsTheme(isDark: boolean): Theme {
  const divider = isDark ? 'rgba(148,163,184,0.18)' : BRAND.border;
  const gridLine = isDark ? 'rgba(148,163,184,0.28)' : '#dfe5ee';
  const colLine = isDark ? 'rgba(148,163,184,0.12)' : '#edf1f6';
  const rowLine = isDark ? 'rgba(148,163,184,0.14)' : '#edf1f6';
  const headBg = isDark ? '#16213a' : '#f1f5f9';
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: BRAND.primary, dark: BRAND.primaryHover, light: BRAND.primaryLight },
      secondary: { main: BRAND.slate500 },
      success: { main: '#16a34a' },
      error: { main: '#dc2626' },
      warning: { main: '#d97706' },
      info: { main: BRAND.primary },
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
      fontSize: 14,
      h4: { fontWeight: 600, fontSize: FONT.display, lineHeight: 1.25, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600, fontSize: FONT.display, lineHeight: 1.25, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, fontSize: FONT.title, lineHeight: 1.5 },
      subtitle1: { fontWeight: 600, fontSize: FONT.title, lineHeight: 1.5 },
      subtitle2: { fontWeight: 600, fontSize: FONT.body, lineHeight: 1.43 },
      body1: { fontSize: FONT.body, lineHeight: 1.43 },
      body2: { fontSize: FONT.body, lineHeight: 1.43 },
      caption: { fontSize: FONT.meta, lineHeight: 1.33 },
      overline: { fontSize: FONT.meta, lineHeight: 1.33, letterSpacing: '0.04em' },
      button: { textTransform: 'none', fontWeight: 500, fontSize: FONT.body, letterSpacing: 0 },
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
        defaultProps: { elevation: 0 },
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
      MuiToolbar: { styleOverrides: { root: { minHeight: `${LAYOUT.appBarHeight}px !important` } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8, height: 36, paddingLeft: 16, paddingRight: 16 }, sizeSmall: { height: 32, paddingLeft: 8, paddingRight: 8 } },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 600, fontSize: FONT.title, padding: '16px 24px' } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 16px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '8px 24px 16px' } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8, fontSize: FONT.body, backgroundColor: isDark ? 'transparent' : '#ffffff' } } },
      MuiInputLabel: { styleOverrides: { root: { fontSize: FONT.body } } },
      MuiFormHelperText: { styleOverrides: { root: { fontSize: FONT.meta, marginLeft: 2, marginRight: 2 } } },
      MuiMenuItem: { styleOverrides: { root: { fontSize: FONT.body } } },
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: { tooltip: { fontSize: FONT.meta, fontWeight: 400, padding: '6px 10px' } },
      },
      // Status pill: used for every status, role, movement type and count in the app
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, borderRadius: 999 },
          sizeSmall: { height: 22, fontSize: FONT.meta },
          label: { paddingLeft: 8, paddingRight: 8 },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { fontSize: FONT.meta },
          toolbar: { minHeight: 48 },
          selectLabel: { fontSize: FONT.meta },
          displayedRows: { fontSize: FONT.meta },
        },
      },
      // ── Table chrome: tinted sticky header, subtle column dividers, row separators, hover/selected ──
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              position: 'sticky',
              top: 0,
              zIndex: 2,
              backgroundColor: headBg,
              color: isDark ? '#cbd5e1' : '#475569',
              fontWeight: 600,
              fontSize: FONT.meta,
              lineHeight: 1.33,
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
            '&:nth-of-type(even)': { backgroundColor: isDark ? 'rgba(255,255,255,0.018)' : '#fbfcfe' },
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
            fontSize: FONT.body,
            lineHeight: 1.43,
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
