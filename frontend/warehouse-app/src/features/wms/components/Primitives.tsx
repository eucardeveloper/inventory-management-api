'use client';

import React from 'react';
import { Box, Paper, Skeleton, Stack, TableCell, TableRow, Typography } from '@mui/material';

// ─── Helper Components ────────────────────────────────────────────────────────

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export function KpiCard({ label, value, icon, color = 'primary.main', subtitle }: KpiCardProps) {
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

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
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

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
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
