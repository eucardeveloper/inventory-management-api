'use client';

import React, { useMemo } from 'react';
import { Box, Grid, Tooltip } from '@mui/material';
import { type StockMovement } from '@/hooks/useWmsQueries';
import { Lang } from '@/features/wms/i18n';

// ─── Movement Trend Chart (area chart, Stripe/Linear style) ─────────────────

export interface TrendProps {
  movements: StockMovement[];
  lang: Lang;
}

export function MovementTrendChart({ movements, lang }: TrendProps) {
  const [hovIdx, setHovIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const now = new Date();
    const loc = lang === 'de' ? 'de-DE' : lang === 'tr' ? 'tr-TR' : 'en-US';
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const dayStr = d.toISOString().slice(0, 10);
      const inQty = movements.filter(m => m.occurredAt.slice(0, 10) === dayStr && m.movementType === 'IN').reduce((s, m) => s + m.quantity, 0);
      const outQty = movements.filter(m => m.occurredAt.slice(0, 10) === dayStr && m.movementType === 'OUT').reduce((s, m) => s + m.quantity, 0);
      return {
        label: d.toLocaleDateString(loc, { month: 'short', day: 'numeric' }),
        in: inQty,
        out: outQty,
        net: inQty - outQty,
      };
    });
  }, [movements, lang]);

  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)), 1);
  const W = 800; const H = 210;
  const PL = 44; const PR = 16; const PT = 20; const PB = 36;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const N = data.length;
  const xOf = (i: number) => PL + (i / (N - 1)) * plotW;
  const yOf = (v: number) => PT + plotH - (v / maxVal) * plotH;
  const labelEvery = Math.ceil(N / 7);
  const GRIDS = 4;

  const buildPath = (vals: number[]) => {
    const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]; const c = pts[i];
      const cpx = ((p.x + c.x) / 2).toFixed(2);
      d += ` C ${cpx} ${p.y.toFixed(2)} ${cpx} ${c.y.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
    }
    return d;
  };

  const buildArea = (vals: number[]) => `${buildPath(vals)} L ${xOf(N - 1).toFixed(2)} ${(PT + plotH).toFixed(2)} L ${xOf(0).toFixed(2)} ${(PT + plotH).toFixed(2)} Z`;

  const inPath = buildPath(data.map(d => d.in));
  const outPath = buildPath(data.map(d => d.out));
  const inArea = buildArea(data.map(d => d.in));
  const outArea = buildArea(data.map(d => d.out));

  const hov = hovIdx !== null ? data[hovIdx] : null;
  const hovX = hovIdx !== null ? xOf(hovIdx) : null;
  const ttW = 88; const ttH = 56;

  return (
    <Box sx={{ overflowX: 'auto', mx: -1 }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', minWidth: 420, cursor: 'crosshair' }}
        aria-label="Movement trend chart"
        onMouseLeave={() => setHovIdx(null)}
        onMouseMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((svgX - PL) / plotW) * (N - 1));
          setHovIdx(Math.max(0, Math.min(N - 1, idx)));
        }}
      >
        <defs>
          <linearGradient id="areaGradIn2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01"/>
          </linearGradient>
          <linearGradient id="areaGradOut2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01"/>
          </linearGradient>
          <filter id="dotGlow2" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="chartClip2">
            <rect x={PL} y={PT} width={plotW} height={plotH + 1}/>
          </clipPath>
        </defs>

        {/* Grid lines + Y labels */}
        {Array.from({ length: GRIDS + 1 }, (_, gi) => {
          const y = PT + (plotH / GRIDS) * gi;
          const val = Math.round(maxVal - (maxVal / GRIDS) * gi);
          return (
            <g key={gi}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="currentColor"
                strokeOpacity={gi === GRIDS ? 0.2 : 0.06}
                strokeWidth={1}/>
              <text x={PL - 7} y={y + 4} fontSize={9} textAnchor="end"
                fill="currentColor" fillOpacity={0.38}
                fontFamily="ui-monospace,monospace">{val}</text>
            </g>
          );
        })}

        {/* Area fills */}
        <g clipPath="url(#chartClip2)">
          <path d={inArea} fill="url(#areaGradIn2)"/>
          <path d={outArea} fill="url(#areaGradOut2)"/>
          <path d={inPath} fill="none" stroke="#10b981" strokeWidth={2.2}
            strokeLinejoin="round" strokeLinecap="round"
            style={{ transition: 'opacity 0.15s' }}
            opacity={hov ? 0.5 : 1}/>
          <path d={outPath} fill="none" stroke="#ef4444" strokeWidth={2.2}
            strokeLinejoin="round" strokeLinecap="round"
            style={{ transition: 'opacity 0.15s' }}
            opacity={hov ? 0.5 : 1}/>
        </g>

        {/* Hover elements */}
        {hovX !== null && hov && (() => {
          const ttX = hovX + 12 + ttW > W - PR ? hovX - ttW - 12 : hovX + 12;
          const ttY = PT + 2;
          const net = hov.net;
          return (
            <g>
              {/* Crosshair line */}
              <line x1={hovX} y1={PT} x2={hovX} y2={PT + plotH}
                stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="4,3"/>

              {/* IN dot */}
              <circle cx={hovX} cy={yOf(hov.in)} r={6} fill="#10b981" filter="url(#dotGlow2)" opacity={0.6}/>
              <circle cx={hovX} cy={yOf(hov.in)} r={4} fill="#10b981"/>
              <circle cx={hovX} cy={yOf(hov.in)} r={2} fill="white"/>

              {/* OUT dot */}
              <circle cx={hovX} cy={yOf(hov.out)} r={6} fill="#ef4444" filter="url(#dotGlow2)" opacity={0.6}/>
              <circle cx={hovX} cy={yOf(hov.out)} r={4} fill="#ef4444"/>
              <circle cx={hovX} cy={yOf(hov.out)} r={2} fill="white"/>

              {/* Tooltip */}
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={7}
                fill="#0c0e14" fillOpacity={0.94}
                stroke="rgba(255,255,255,0.09)" strokeWidth={1}/>
              <text x={ttX + 10} y={ttY + 15} fontSize={9.5}
                fill="rgba(255,255,255,0.45)" fontFamily="system-ui,sans-serif">
                {data[hovIdx!].label}
              </text>
              {/* IN row */}
              <circle cx={ttX + 12} cy={ttY + 28} r={4} fill="#10b981"/>
              <text x={ttX + 21} y={ttY + 32} fontSize={10} fill="#10b981"
                fontWeight="700" fontFamily="ui-monospace,monospace">+{hov.in}</text>
              {/* OUT row */}
              <circle cx={ttX + 12} cy={ttY + 44} r={4} fill="#ef4444"/>
              <text x={ttX + 21} y={ttY + 48} fontSize={10} fill="#ef4444"
                fontWeight="700" fontFamily="ui-monospace,monospace">-{hov.out}</text>
              {/* Net badge */}
              <text x={ttX + ttW - 8} y={ttY + 40} fontSize={10} textAnchor="end"
                fill={net >= 0 ? '#10b981' : '#ef4444'}
                fontWeight="800" fontFamily="ui-monospace,monospace">
                {net >= 0 ? '+' : ''}{net}
              </text>
            </g>
          );
        })()}

        {/* X axis labels */}
        {data.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={xOf(i)} y={H - 8} fontSize={9} textAnchor="middle"
            fill="currentColor" fillOpacity={0.35}
            fontFamily="system-ui,sans-serif">{d.label}</text>
        ))}
      </svg>
    </Box>
  );
}
