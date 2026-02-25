import React from 'react';
import { COLORS, FONT, RADIUS } from '../styles';
import type { WeeklyMetric } from '@domain/types/dashboard';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  delta?: { pct: number; sign: '+' | '-' | '' };
  sparkData: number[];
}

export function MetricCard({ label, value, unit, delta, sparkData }: MetricCardProps) {
  const sparkline = buildSparkline(sparkData);

  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.valueRow}>
        <span style={styles.value}>{value}</span>
        <span style={styles.unit}>{unit}</span>
      </div>
      {delta && delta.sign !== '' && (
        <div style={{
          ...styles.delta,
          color: delta.sign === '+' ? COLORS.green : COLORS.red,
        }}>
          {delta.sign}{delta.pct}%
        </div>
      )}
      <svg viewBox="0 0 100 30" style={styles.spark} preserveAspectRatio="none">
        <polyline
          points={sparkline}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function buildSparkline(data: number[]): string {
  if (!data.length) return '';
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 28 - ((v - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(' ');
}

export function buildMetricCards(
  metrics: WeeklyMetric[],
  distanceUnit: 'mi' | 'km'
) {
  const isMi = distanceUnit === 'mi';
  const latest = metrics[metrics.length - 1];
  const prev = metrics.length > 1 ? metrics[metrics.length - 2] : null;

  const volumeConv = (m: number) => isMi ? m / 1609.34 : m / 1000;
  const vertConv = (m: number) => isMi ? m * 3.28084 : m;

  const calcDelta = (cur: number, prv: number | undefined) => {
    if (!prv) return undefined;
    const pct = Math.round(((cur - prv) / (prv || 1)) * 100);
    return { pct: Math.abs(pct), sign: (pct > 0 ? '+' : pct < 0 ? '-' : '') as '+' | '-' | '' };
  };

  return [
    {
      label: 'Weekly Volume',
      value: latest ? volumeConv(latest.volume_m).toFixed(1) : '0',
      unit: isMi ? 'mi' : 'km',
      delta: latest && prev ? calcDelta(latest.volume_m, prev.volume_m) : undefined,
      sparkData: metrics.map(m => volumeConv(m.volume_m)),
    },
    {
      label: 'Vert',
      value: latest ? Math.round(vertConv(latest.vert_m)).toLocaleString() : '0',
      unit: isMi ? 'ft' : 'm',
      delta: latest && prev ? calcDelta(latest.vert_m, prev.vert_m) : undefined,
      sparkData: metrics.map(m => vertConv(m.vert_m)),
    },
    {
      label: 'Duration',
      value: latest ? (latest.duration_s / 3600).toFixed(1) : '0',
      unit: 'hrs',
      delta: latest && prev ? calcDelta(latest.duration_s, prev.duration_s) : undefined,
      sparkData: metrics.map(m => m.duration_s / 3600),
    },
    {
      label: 'Long Run',
      value: latest ? volumeConv(latest.long_run_m).toFixed(1) : '0',
      unit: isMi ? 'mi' : 'km',
      delta: latest && prev ? calcDelta(latest.long_run_m, prev.long_run_m) : undefined,
      sparkData: metrics.map(m => volumeConv(m.long_run_m)),
    },
  ];
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    flex: 1,
    minWidth: 160,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: '16px 20px',
    position: 'relative',
    overflow: 'hidden',
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  value: {
    fontFamily: FONT.mono,
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.text,
  },
  unit: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
  },
  delta: {
    fontFamily: FONT.mono,
    fontSize: 12,
    marginTop: 4,
  },
  spark: {
    width: '100%',
    height: 30,
    marginTop: 12,
    opacity: 0.6,
  },
};
