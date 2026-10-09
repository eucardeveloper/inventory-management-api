'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Lang } from '@/features/wms/i18n';
import { localeOf } from '@/features/wms/dates';
import { formatInt } from '@/features/wms/format';
import { labelIndices, niceScale } from '@/features/wms/chartScale';
import { type DailySeries, type MovedProduct } from '@/features/wms/trend';

// ─── Daily stock in / stock out, last 30 days (area + line) ─────────────────
// Drawn at 1:1 pixels (the SVG is sized from its container), so axis text really is 12px. Both series share
// one "nice" y-axis with real ticks. Hover or arrow keys move a crosshair and show that day's values.
// Colours: the accent blue for stock in, slate grey for stock out. No red/green: direction is not a status.

const IN_COLOR = '#2563eb';
const OUT_COLOR = '#64748b';
const FONT = 12;

export interface TrendProps {
  series: DailySeries;
  lang: Lang;
  /** Accessible description of the chart, from the dictionary. */
  label: string;
  inLabel: string;
  outLabel: string;
}

export function MovementTrendChart({ series, lang, label, inLabel, outLabel }: TrendProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hov, setHov] = useState<number | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const loc = localeOf(lang);
  const data = useMemo(
    () => series.points.map((p) => ({
      ...p,
      short: p.date.toLocaleDateString(loc, { day: 'numeric', month: 'short' }),
      full: p.date.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'long' }),
    })),
    [series, loc],
  );
  const scale = useMemo(() => niceScale(Math.max(...data.map((d) => Math.max(d.in, d.out)), 0), 4), [data]);

  const { w, h } = size;
  const PL = 40, PR = 8, PT = 8, PB = 28;
  const plotW = Math.max(0, w - PL - PR);
  const plotH = Math.max(0, h - PT - PB);
  const n = data.length;
  const xOf = (i: number) => PL + (n <= 1 ? 0 : (plotW * i) / (n - 1));
  const yOf = (v: number) => PT + plotH - (v / scale.max) * plotH;
  const linePath = (key: 'in' | 'out') => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(' ');
  const areaPath = (key: 'in' | 'out') => `${linePath(key)} L${xOf(n - 1).toFixed(1)},${yOf(0)} L${xOf(0).toFixed(1)},${yOf(0)} Z`;
  const xLabels = labelIndices(n, plotW, 72);
  const tip = hov !== null ? data[hov] : null;

  const move = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - PL;
    setHov(Math.max(0, Math.min(n - 1, Math.round((x / Math.max(1, plotW)) * (n - 1)))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHov((v) => Math.max(0, (v ?? n) - 1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setHov((v) => Math.min(n - 1, (v ?? -1) + 1)); }
    else if (e.key === 'Escape') setHov(null);
  };

  return (
    <Box ref={hostRef} sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 200 }}>
      {w > 0 && h > 0 && (
        <svg
          width={w} height={h} role="img" aria-label={label} tabIndex={0}
          style={{ display: 'block', color: 'inherit' }}
          onMouseMove={move} onMouseLeave={() => setHov(null)} onKeyDown={onKey} onBlur={() => setHov(null)}
        >
          <defs>
            <linearGradient id="trend-in" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={IN_COLOR} stopOpacity={0.22} />
              <stop offset="1" stopColor={IN_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {scale.ticks.map((tv) => (
            <g key={tv}>
              <line x1={PL} x2={w - PR} y1={yOf(tv)} y2={yOf(tv)} stroke="currentColor" strokeOpacity={tv === 0 ? 0.3 : 0.1} />
              <text x={PL - 8} y={yOf(tv) + 4} fontSize={FONT} textAnchor="end" fill="currentColor" fillOpacity={0.7}>{formatInt(tv, lang)}</text>
            </g>
          ))}
          <path d={areaPath('in')} fill="url(#trend-in)" />
          <path d={linePath('out')} fill="none" stroke={OUT_COLOR} strokeWidth={2} strokeLinejoin="round" strokeDasharray="5 3" />
          <path d={linePath('in')} fill="none" stroke={IN_COLOR} strokeWidth={2} strokeLinejoin="round" />
          {data.map((d, i) => (
            <g key={d.key}>
              {d.in > 0 && <circle cx={xOf(i)} cy={yOf(d.in)} r={hov === i ? 4 : 2.5} fill={IN_COLOR} />}
              {d.out > 0 && <circle cx={xOf(i)} cy={yOf(d.out)} r={hov === i ? 4 : 2.5} fill="#fff" stroke={OUT_COLOR} strokeWidth={1.5} />}
            </g>
          ))}
          {hov !== null && <line x1={xOf(hov)} x2={xOf(hov)} y1={PT} y2={PT + plotH} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="3 3" />}
          {xLabels.map((i) => (
            <text key={i} x={xOf(i)} y={h - 8} fontSize={FONT} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fill="currentColor" fillOpacity={0.7}>{data[i].short}</text>
          ))}
        </svg>
      )}
      {tip && w > 0 && (
        <Box
          role="status"
          sx={{
            position: 'absolute', top: 8, pointerEvents: 'none', px: 1.5, py: 1, borderRadius: '8px',
            bgcolor: '#0f172a', color: '#fff', fontSize: '0.75rem', lineHeight: 1.5, boxShadow: 3, whiteSpace: 'nowrap',
            ...(hov! > n / 2 ? { right: w - xOf(hov!) + 12 } : { left: xOf(hov!) + 12 }),
          }}
        >
          <Box sx={{ fontWeight: 600 }}>{tip.full}</Box>
          <Box>{inLabel}: {formatInt(tip.in, lang)}</Box>
          <Box>{outLabel}: {formatInt(tip.out, lang)}</Box>
        </Box>
      )}
    </Box>
  );
}

/** Legend for the chart: line sample + name. */
export function TrendLegend({ inLabel, outLabel }: { inLabel: string; outLabel: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 16, height: 0, borderTop: `2px solid ${IN_COLOR}` }} />
        <Typography variant="caption" noWrap>{inLabel}</Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 16, height: 0, borderTop: `2px dashed ${OUT_COLOR}` }} />
        <Typography variant="caption" noWrap>{outLabel}</Typography>
      </Stack>
    </Stack>
  );
}

/**
 * Used instead of the line chart when a month holds too few movements for a line to mean anything:
 * the most-moved products as a compact ranked list with in/out bars.
 */
export function TopMovedList({ rows, lang, inLabel, outLabel }: { rows: MovedProduct[]; lang: Lang; inLabel: string; outLabel: string }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <Stack spacing={1.5} component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {rows.map((r, i) => (
        <Box component="li" key={r.productId} sx={{ display: 'grid', gridTemplateColumns: '16px minmax(0,1fr) auto', columnGap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">{i + 1}</Typography>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap title={r.name}>{r.name}</Typography>
            <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'action.hover', mt: 0.5 }} aria-hidden>
              <Box sx={{ width: `${(r.in / max) * 100}%`, bgcolor: IN_COLOR }} />
              <Box sx={{ width: `${(r.out / max) * 100}%`, bgcolor: '#94a3b8' }} />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {inLabel} {formatInt(r.in, lang)} · {outLabel} {formatInt(r.out, lang)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
