'use client';

import React from 'react';
import { Box, Button, Chip, IconButton, Paper, Skeleton, Stack, TableCell, TableContainer, TableRow, Tooltip, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { ErrorOutline as ErrorOutlineIcon, InfoOutlined as InfoOutlinedIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';

// ─── Shared building blocks ──────────────────────────────────────────────────
// Every screen is made of the same few pieces so spacing, borders, chips and states look identical.

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const TONES: Record<Tone, { fg: string; fgDark: string; bg: string }> = {
  primary: { fg: '#1d4ed8', fgDark: '#93c5fd', bg: 'rgba(37,99,235,0.10)' },
  success: { fg: '#15803d', fgDark: '#4ade80', bg: 'rgba(22,163,74,0.12)' },
  warning: { fg: '#b45309', fgDark: '#fbbf24', bg: 'rgba(217,119,6,0.14)' },
  error: { fg: '#b91c1c', fgDark: '#f87171', bg: 'rgba(220,38,38,0.12)' },
  info: { fg: '#1d4ed8', fgDark: '#93c5fd', bg: 'rgba(37,99,235,0.10)' },
  neutral: { fg: '#475569', fgDark: '#cbd5e1', bg: 'rgba(100,116,139,0.14)' },
};

/** Soft-tinted chip. Used for every status, role, movement type and count in the app. */
export function StatusChip({ label, tone = 'neutral', icon, onClick, title, sx }: {
  label: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactElement;
  onClick?: () => void;
  title?: string;
  sx?: SxProps<Theme>;
}) {
  const t = TONES[tone];
  return (
    <Chip
      size="small"
      label={label}
      icon={icon}
      onClick={onClick}
      title={title}
      sx={[
        (theme) => ({
          bgcolor: t.bg,
          color: theme.palette.mode === 'dark' ? t.fgDark : t.fg,
          fontWeight: 500,
          maxWidth: 'none',
          verticalAlign: 'middle',
          '& .MuiChip-label': { overflow: 'visible', whiteSpace: 'nowrap' },
          '& .MuiChip-icon': { color: 'inherit', fontSize: 14, ml: '6px' },
          '&:hover': onClick ? { bgcolor: t.bg, filter: 'brightness(0.95)' } : undefined,
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}

/** White card with a 1px slate border. */
export function SectionCard({ children, sx }: { children: React.ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Paper
      elevation={0}
      sx={[
        { border: '1px solid', borderColor: 'divider', borderRadius: '8px', minWidth: 0, overflow: 'hidden' },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}

/** Card title row for charts and panels: 16px title, optional 12px subtitle, optional action on the right. */
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ minWidth: 0 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary" component="div">{subtitle}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

/**
 * Toolbar row above a table: search and filters on the left (aligned on one baseline), the result count on
 * the right. It lives inside the table card so toolbar, header and rows read as one object.
 */
export function TableToolbar({ children, count }: { children?: React.ReactNode; count?: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      sx={{ gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', minWidth: 0 }}
    >
      <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5, minWidth: 0, flex: 1 }}>{children}</Stack>
      {count != null && <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{count}</Typography>}
    </Stack>
  );
}

/**
 * Table inside a bordered card (1px outer border from SectionCard). An optional toolbar sits on top; the
 * table container scrolls both ways, so the tinted header stays visible while long lists scroll and wide
 * tables never widen the page. A pagination bar placed inside sticks to the bottom edge.
 */
export function TableCard({ children, toolbar, maxHeight = 'calc(100vh - 280px)' }: { children: React.ReactNode; toolbar?: React.ReactNode; maxHeight?: string | number }) {
  return (
    <SectionCard>
      {toolbar}
      <TableContainer
        sx={{
          overflow: 'auto',
          maxWidth: '100%',
          maxHeight,
          '& .MuiTablePagination-root': { position: 'sticky', left: 0, bottom: 0, zIndex: 3, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' },
        }}
      >
        {children}
      </TableContainer>
    </SectionCard>
  );
}

/**
 * Sticky style for the last (actions) column: it stays visible when a wide table scrolls sideways.
 * Spread into the `sx` of both the header cell and the body cells.
 */
export const stickyActions: SxProps<Theme> = {
  position: 'sticky',
  right: 0,
  zIndex: 1,
  bgcolor: 'inherit', // follows the row (zebra, hover, selected) instead of hiding it
  borderLeft: '1px solid',
  borderLeftColor: 'divider',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  // shrink to the content: `width: 1` in sx means 100% and used to create a phantom wide column
  width: '1%',
  // buttons are 32px high; tighter padding keeps the row at 44px
  py: 0.5,
  px: 1,
};

/** Page title row: 24px title and a one-line description on the left, the primary action on the right. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ gap: 2, minWidth: 0 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" component="h1" noWrap>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>{actions}</Stack>}
    </Stack>
  );
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  /** Colours the sub-text line only (warning / error); the value itself stays neutral. */
  tone?: Tone;
  subtitle?: string;
  /** Explains the metric (formula, assumptions). Shown in a tooltip behind an info button. */
  hint?: string;
  hintLabel?: string;
  loading?: boolean;
}

/** One metric: 12px label, 24px value, 12px sub-text. Always three lines, so every card has the same height. */
export function KpiCard({ label, value, tone = 'neutral', subtitle, hint, hintLabel, loading }: KpiCardProps) {
  const t = TONES[tone];
  return (
    <SectionCard sx={{ p: 2, height: '100%' }}>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, height: 20 }}>
          <Typography variant="caption" noWrap title={label} sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, flex: 1 }}>
            {label}
          </Typography>
          {hint && (
            <Tooltip title={hint} enterTouchDelay={0}>
              <IconButton size="small" aria-label={hintLabel ?? label} sx={{ p: 0.25, mr: -0.5 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {loading ? (
          <Skeleton width={96} height={32} />
        ) : (
          <Typography variant="h4" component="div" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {value}
          </Typography>
        )}
        <Typography
          variant="caption"
          noWrap
          title={subtitle}
          sx={(theme) => ({ minHeight: '1.33em', color: tone === 'neutral' ? 'text.secondary' : theme.palette.mode === 'dark' ? t.fgDark : t.fg })}
        >
          {subtitle ?? '\u00a0'}
        </Typography>
      </Stack>
    </SectionCard>
  );
}

/**
 * Row action with a visible text label on wide screens and an icon-only button (still named and
 * explained by a tooltip) on narrow ones. Disabled actions say why in the tooltip.
 */
export function ActionButton({ label, icon, onClick, color = 'primary', disabled, disabledReason }: {
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  color?: 'primary' | 'error' | 'warning' | 'success' | 'inherit';
  disabled?: boolean;
  disabledReason?: string;
}) {
  // quiet grey at rest; the semantic colour appears on hover/focus so rows are not a wall of coloured icons
  const hover = color === 'inherit' ? 'text.primary' : `${color}.main`;
  return (
    <Tooltip title={disabled && disabledReason ? disabledReason : label}>
      <span>
        <Button
          size="small"
          color="inherit"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          startIcon={icon}
          sx={{
            minWidth: 0,
            color: 'text.secondary',
            px: { xs: 0.75, xl: 1.25 },
            '&:hover, &:focus-visible': { color: hover, bgcolor: 'action.hover' },
            '& .MuiButton-startIcon': { mr: { xs: 0, xl: 0.75 }, ml: 0 },
            '& .action-label': { display: { xs: 'none', xl: 'inline' } },
          }}
        >
          <span className="action-label">{label}</span>
        </Button>
      </span>
    </Tooltip>
  );
}

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
  /** Success-flavoured empty state (nothing needs attention). */
  tone?: 'neutral' | 'success';
}

/** Friendly empty state. Compact on purpose: it sizes to its content, never to a tall empty box. */
export function EmptyState({ icon, title, message, action, tone = 'neutral' }: EmptyStateProps) {
  const t = TONES[tone === 'success' ? 'success' : 'neutral'];
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 4, px: 2, textAlign: 'center' }}>
      <Box
        sx={(theme) => ({
          width: 40, height: 40, borderRadius: '50%',
          bgcolor: t.bg,
          color: theme.palette.mode === 'dark' ? t.fgDark : t.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '& svg': { fontSize: 22 },
        })}
      >
        {icon}
      </Box>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>{message}</Typography>
      {action && <Box sx={{ pt: 0.5 }}>{action}</Box>}
    </Stack>
  );
}

/** Visible failure instead of a silently empty screen. `bare` drops the border when it sits inside a card. */
export function ErrorState({ title, message, onRetry, retryLabel, bare }: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel: string;
  bare?: boolean;
}) {
  const body = (
    <Stack alignItems="center" spacing={1} sx={{ py: 4, px: 2, textAlign: 'center' }} role="alert">
      <Box
        sx={(theme) => ({
          width: 40, height: 40, borderRadius: '50%',
          bgcolor: TONES.error.bg,
          color: theme.palette.mode === 'dark' ? TONES.error.fgDark : TONES.error.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        })}
      >
        <ErrorOutlineIcon />
      </Box>
      <Typography variant="subtitle2">{title}</Typography>
      {message && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, overflowWrap: 'anywhere' }}>{message}</Typography>}
      {onRetry && <Button variant="outlined" size="small" onClick={onRetry} sx={{ mt: 0.5 }}>{retryLabel}</Button>}
    </Stack>
  );
  return bare ? body : <SectionCard>{body}</SectionCard>;
}

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton animation="wave" height={22} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Stock status as icon + text + colour (never colour alone). */
export function StockStatusChip({ status, labels }: { status: 'out' | 'low' | 'ok'; labels: { out: string; low: string; ok: string } }) {
  if (status === 'out') return <StatusChip tone="error" icon={<ErrorOutlineIcon />} label={labels.out} />;
  if (status === 'low') return <StatusChip tone="warning" icon={<WarningAmberIcon />} label={labels.low} />;
  return <StatusChip tone="success" label={labels.ok} />;
}

export interface SplitSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Compact share-of-total bar with a legend (replaces pie charts: two or three values need a ruler, not a circle).
 * Segments with a zero value are kept in the legend so the card always lists every category.
 */
export function SplitBar({ title, segments, formatValue, ariaLabel }: { title: string; segments: SplitSegment[]; formatValue: (n: number) => string; ariaLabel?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <SectionCard sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>{title}</Typography>
      <Box role="img" aria-label={ariaLabel ?? title} sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: 'action.hover', gap: '2px' }}>
        {segments.filter((s) => s.value > 0).map((s) => (
          <Box key={s.label} sx={{ width: `${(s.value / Math.max(total, 1)) * 100}%`, bgcolor: s.color }} />
        ))}
      </Box>
      <Stack direction="row" flexWrap="wrap" sx={{ mt: 1.5, columnGap: 3, rowGap: 0.5 }}>
        {segments.map((s) => (
          <Stack key={s.label} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatValue(s.value)}{total > 0 ? ` (${Math.round((s.value / total) * 100)}%)` : ''}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  );
}
