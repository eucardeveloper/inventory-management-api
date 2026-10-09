'use client';

import React from 'react';
import { Box, Button, Chip, IconButton, Paper, Skeleton, Stack, TableCell, TableContainer, TableRow, Tooltip, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { CheckCircleOutline as CheckCircleOutlineIcon, ErrorOutline as ErrorOutlineIcon, InfoOutlined as InfoOutlinedIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';

// ─── Shared building blocks ──────────────────────────────────────────────────
// Every screen is made of the same few pieces so spacing, borders, chips and states look identical.

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const TONES: Record<Tone, { fg: string; fgDark: string; bg: string }> = {
  primary: { fg: '#1d4ed8', fgDark: '#93c5fd', bg: 'rgba(37,99,235,0.10)' },
  success: { fg: '#15803d', fgDark: '#4ade80', bg: 'rgba(22,163,74,0.12)' },
  warning: { fg: '#b45309', fgDark: '#fbbf24', bg: 'rgba(217,119,6,0.14)' },
  error: { fg: '#b91c1c', fgDark: '#f87171', bg: 'rgba(220,38,38,0.12)' },
  info: { fg: '#0369a1', fgDark: '#7dd3fc', bg: 'rgba(14,165,233,0.13)' },
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
          fontWeight: 700,
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
        { border: '1px solid', borderColor: 'divider', borderRadius: '12px', minWidth: 0, overflow: 'hidden' },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}

/** Card title row for charts and panels. */
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2, minWidth: 0 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

/**
 * Table inside a bordered card (1px outer border from SectionCard). The container scrolls both ways, so the
 * tinted header stays visible while long lists scroll and wide tables never widen the page. A pagination
 * bar placed inside sticks to the bottom edge.
 */
export function TableCard({ children, maxHeight = 'calc(100vh - 230px)' }: { children: React.ReactNode; maxHeight?: string | number }) {
  return (
    <SectionCard>
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
};

/** Page title row: title and optional subtitle on the left, actions on the right, wraps on phones. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ gap: 1.5, minWidth: 0 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" noWrap>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>{actions}</Stack>}
    </Stack>
  );
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: Tone;
  subtitle?: string;
  /** Explains the metric (formula, assumptions). Shown in a tooltip behind an info button. */
  hint?: string;
  hintLabel?: string;
  loading?: boolean;
}

/** One metric. The value never wraps; the label says exactly what is measured. */
export function KpiCard({ label, value, icon, tone = 'primary', subtitle, hint, hintLabel, loading }: KpiCardProps) {
  const t = TONES[tone];
  return (
    <SectionCard sx={{ p: 2, height: '100%' }}>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Box
            sx={(theme) => ({
              width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
              bgcolor: t.bg,
              color: theme.palette.mode === 'dark' ? t.fgDark : t.fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '& svg': { fontSize: 18 },
            })}
          >
            {icon}
          </Box>
          <Typography variant="caption" noWrap title={label} sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 0, flex: 1 }}>
            {label}
          </Typography>
          {hint && (
            <Tooltip title={hint} enterTouchDelay={0}>
              <IconButton size="small" aria-label={hintLabel ?? label} sx={{ p: 0.25 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {loading ? (
          <Skeleton width={96} height={40} />
        ) : (
          <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: { xs: '1.5rem', xl: '1.5rem' }, lineHeight: 1.2 }}>
            {value}
          </Typography>
        )}
        {/* the sub-text line is always rendered so every card has the same height */}
        <Typography variant="caption" color="text.secondary" noWrap title={subtitle} sx={{ minHeight: '1.4em' }}>{subtitle ?? '\u00a0'}</Typography>
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
  return (
    <Tooltip title={disabled && disabledReason ? disabledReason : label}>
      <span>
        <Button
          size="small"
          color={color}
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          startIcon={icon}
          sx={{
            minWidth: 0,
            px: { xs: 0.75, xl: 1.25 },
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
}

/** Friendly empty state. Compact on purpose: it sizes to its content, never to a tall empty box. */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 5, px: 2, textAlign: 'center' }}>
      <Box
        sx={(theme) => ({
          width: 48, height: 48, borderRadius: '12px',
          bgcolor: TONES.primary.bg,
          color: theme.palette.mode === 'dark' ? TONES.primary.fgDark : TONES.primary.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '& svg': { fontSize: 26 },
        })}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>{message}</Typography>
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );
}

/** Visible failure instead of a silently empty screen. */
export function ErrorState({ title, message, onRetry, retryLabel }: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <SectionCard sx={{ borderColor: 'error.main' }}>
      <Stack alignItems="center" spacing={1} sx={{ py: 4, px: 2, textAlign: 'center' }} role="alert">
        <Box
          sx={(theme) => ({
            width: 48, height: 48, borderRadius: '12px',
            bgcolor: TONES.error.bg,
            color: theme.palette.mode === 'dark' ? TONES.error.fgDark : TONES.error.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          })}
        >
          <ErrorOutlineIcon />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {message && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, overflowWrap: 'anywhere' }}>{message}</Typography>}
        {onRetry && <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>{retryLabel}</Button>}
      </Stack>
    </SectionCard>
  );
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
  return <StatusChip tone="success" icon={<CheckCircleOutlineIcon />} label={labels.ok} />;
}
