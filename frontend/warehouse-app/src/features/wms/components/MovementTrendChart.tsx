'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { type StockMovement } from '@/hooks/useWmsQueries';
import { Lang } from '@/features/wms/i18n';
import { localDayKey, localeOf, parseApiDate } from '@/features/wms/dates';
import { formatInt } from '@/features/wms/format';
import { labelIndices, niceScale } from '@/features/wms/chartScale';

// ─── Daily stock in / stock out, last 30 days (grouped bars) ────────────────
// Drawn at 1:1 pixels (the SVG is sized from its container), so axis text is really 12px. Bars share one
// "nice" y-axis with real ticks; hovering or focusing a day shows its values.

export interface TrendProps {
  movements: StockMovement[];
  lang: Lang;
  /** Accessible description of the chart, from the dictionary. */
  label: string;
  /** Names for the legend/tooltip, from the dictionary. */
  inLabel: string;
  outLabel: string;
}

const IN_COLOR = '#16a34a';
const OUT_COLOR = '#dc2626';
const FONT = 12;

export function MovementTrendChart({ movements, lang, label, inLabel, outLabel }: TrendProps) {
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

  const data = useMemo(() => {
    const now = new Date();
    const loc = localeOf(lang);
    const perDay = new Map<string, { in: number; out: number }>();
    for (const m of movements) {
      const when = parseApiDate(m.occurredAt);
      if (!when) continue;
      const key = localDayKey(when);
      const bucket = perDay.get(key) ?? { in: 0, out: 0 };
      if (m.movementType === 'IN') bucket.in += m.quantity;
      else bucket.out += m.quantity;
      perDay.set(key, bucket);
    }
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const b = perDay.get(localDayKey(d)) ?? { in: 0, out: 0 };
      return {
        label: d.toLocaleDateString(loc, { day: 'numeric', month: 'short' }),
        full: d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }),
        in: b.in,
        out: b.out,
      };
    });
  }, [movements, lang]);

  const scale = useMemo(() => niceScale(Math.max(...data.map((d) => Math.max(d.in, d.out)), 0), 4), [data]);

  const { w, h } = size;
  const PL = 44, PR = 8, PT = 12, PB = 28;
  const plotW = Math.max(0, w - PL - PR);
  const plotH = Math.max(0, h - PT - PB);
  const slot = plotW / data.length;
  const barW = Math.max(2, Math.min(14, (slot - 4) / 2));
  const yOf = (v: number) => PT + plotH - (v / scale.max) * plotH;
  const xLabels = labelIndices(data.length, plotW, 64);
  const tip = hov !== null ? data[hov] : null;

  return (
    <Box ref={hostRef} sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 240 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={label} style={{ display: 'block' }} onMouseLeave={() => setHov(null)}>
          {scale.ticks.map((tv) => (
            <g key={tv}>
              <line x1={PL} x2={w - PR} y1={yOf(tv)} y2={yOf(tv)} stroke="currentColor" strokeOpacity={tv === 0 ? 0.35 : 0.12} />
              <text x={PL - 8} y={yOf(tv) + 4} fontSize={FONT} textAnchor="end" fill="currentColor" fillOpacity={0.7}>{formatInt(tv, lang)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PL + slot * i + slot / 2;
            const active = hov === i;
            return (
              <g key={i} onMouseEnter={() => setHov(i)} onFocus={() => setHov(i)} onBlur={() => setHov(null)} tabIndex={0}
                aria-label={`${d.full}: ${inLabel} ${d.in}, ${outLabel} ${d.out}`}>
                <rect x={PL + slot * i} y={PT} width={slot} height={plotH} fill={active ? 'currentColor' : 'transparent'} fillOpacity={0.06} />
                {d.in > 0 && <rect x={cx - barW - 1} y={yOf(d.in)} width={barW} height={PT + plotH - yOf(d.in)} rx={2} fill={IN_COLOR} />}
                {d.out > 0 && <rect x={cx + 1} y={yOf(d.out)} width={barW} height={PT + plotH - yOf(d.out)} rx={2} fill={OUT_COLOR} />}
              </g>
            );
          })}
          {xLabels.map((i) => (
            <text key={i} x={PL + slot * i + slot / 2} y={h - 8} fontSize={FONT} textAnchor="middle" fill="currentColor" fillOpacity={0.7}>{data[i].label}</text>
          ))}
        </svg>
      )}
      {tip && w > 0 && (
        <Box
          role="status"
          sx={{
            position: 'absolute', top: 8, pointerEvents: 'none', px: 1.25, py: 0.75, borderRadius: '8px',
            bgcolor: '#0b1f3a', color: '#fff', fontSize: '0.8125rem', lineHeight: 1.5, boxShadow: 3,
            ...(hov! > data.length / 2 ? { right: w - (PL + slot * hov!) + 8 } : { left: PL + slot * (hov! + 1) + 8 }),
          }}
        >
          <Box sx={{ fontWeight: 700 }}>{tip.full}</Box>
          <Box sx={{ color: '#86efac' }}>{inLabel}: {formatInt(tip.in, lang)}</Box>
          <Box sx={{ color: '#fca5a5' }}>{outLabel}: {formatInt(tip.out, lang)}</Box>
        </Box>
      )}
    </Box>
  );
}
