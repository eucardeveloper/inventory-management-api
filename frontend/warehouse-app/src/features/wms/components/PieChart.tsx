'use client';

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

// ─── Pie / Donut Chart (pure SVG, hover-scale slices) ───────────────────────

export interface PieSlice { label: string; value: number; color: string; }

export function PieChart({ slices, size = 180, donut = false, title }: {
  slices: PieSlice[]; size?: number; donut?: boolean; title?: string;
}) {
  const [hovIdx, setHovIdx] = React.useState<number | null>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;
  const cx = size / 2; const cy = size / 2;
  const r = size / 2 - 14;
  const inner = donut ? r * 0.54 : 0;
  let running = 0;
  const startAngles = slices.map((sl) => {
    const start = -Math.PI / 2 + (running / total) * 2 * Math.PI;
    running += sl.value;
    return start;
  });
  const paths = slices.map((sl, idx) => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const start = startAngles[idx];
    const end = start + sweep;
    const midAngle = start + sweep / 2;
    const push = hovIdx === idx ? 8 : 0;
    const ox = push * Math.cos(midAngle);
    const oy = push * Math.sin(midAngle);
    const x1 = cx + ox + r * Math.cos(start);
    const y1 = cy + oy + r * Math.sin(start);
    const x2 = cx + ox + r * Math.cos(end);
    const y2 = cy + oy + r * Math.sin(end);
    const xi1 = cx + ox + inner * Math.cos(start);
    const yi1 = cy + oy + inner * Math.sin(start);
    const xi2 = cx + ox + inner * Math.cos(end);
    const yi2 = cy + oy + inner * Math.sin(end);
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
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.45} letterSpacing="2">TOTAL</text>
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
