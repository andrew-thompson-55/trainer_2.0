import React, { useState } from 'react';
import { COLORS, FONT, RADIUS } from '../styles';
import { formatWeekLabel } from '../utils';
import type { WeeklyMetric } from '@domain/types/dashboard';

interface VolumeChartsProps {
  metrics: WeeklyMetric[];
  distanceUnit: 'mi' | 'km';
}

export function VolumeCharts({ metrics, distanceUnit }: VolumeChartsProps) {
  const isMi = distanceUnit === 'mi';
  const volumeData = metrics.map(m => isMi ? m.volume_m / 1609.34 : m.volume_m / 1000);
  const vertData = metrics.map(m => isMi ? m.vert_m * 3.28084 : m.vert_m);

  return (
    <div className="dash-charts" style={styles.container}>
      <BarChart
        title={`Weekly Volume (${isMi ? 'mi' : 'km'})`}
        data={volumeData}
        labels={metrics.map(m => formatWeekLabel(m.week_start))}
        color={COLORS.accent}
        formatValue={(v) => v.toFixed(1)}
      />
      <BarChart
        title={`Weekly Vert (${isMi ? 'ft' : 'm'})`}
        data={vertData}
        labels={metrics.map(m => formatWeekLabel(m.week_start))}
        color={COLORS.green}
        formatValue={(v) => Math.round(v).toLocaleString()}
      />
    </div>
  );
}

function getChartScale(values: number[]): { yMax: number; outlierIndices: Set<number> } {
  const nonZero = values.filter(v => v > 0);
  if (nonZero.length < 4) {
    return { yMax: Math.max(...values, 1), outlierIndices: new Set() };
  }

  const sorted = [...nonZero].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const upperFence = q3 + 1.5 * iqr;

  const outlierIndices = new Set<number>();
  values.forEach((v, i) => {
    if (v > upperFence) outlierIndices.add(i);
  });

  if (outlierIndices.size === 0) {
    return { yMax: Math.max(...values, 1), outlierIndices };
  }

  return { yMax: upperFence * 1.15, outlierIndices };
}

interface BarChartProps {
  title: string;
  data: number[];
  labels: string[];
  color: string;
  formatValue: (v: number) => string;
}

function BarChart({ title, data, labels, color, formatValue }: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [normalized, setNormalized] = useState(true);

  const rawMax = Math.max(...data, 1);
  const { yMax: normMax, outlierIndices } = getChartScale(data);
  const hasOutliers = outlierIndices.size > 0;
  const yMax = normalized ? normMax : rawMax;

  return (
    <div style={styles.chart}>
      <div style={styles.chartHeader}>
        <div style={styles.chartTitle}>{title}</div>
        {hasOutliers && (
          <div style={styles.toggleGroup}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(normalized ? {} : styles.toggleBtnActive),
              }}
              onClick={() => setNormalized(false)}
            >
              All
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                ...(normalized ? styles.toggleBtnActive : {}),
              }}
              onClick={() => setNormalized(true)}
            >
              Normalized
            </button>
          </div>
        )}
      </div>
      <div style={styles.barsContainer}>
        {data.map((val, i) => {
          const isOutlier = normalized && outlierIndices.has(i);
          const height = isOutlier
            ? 100
            : Math.max((val / yMax) * 100, val > 0 ? 2 : 0);
          const isHovered = hovered === i;
          return (
            <div
              key={i}
              style={styles.barCol}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {(isHovered || isOutlier) && val > 0 && (
                <div style={styles.tooltip}>
                  {formatValue(val)}
                </div>
              )}
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.bar,
                    height: `${height}%`,
                    backgroundColor: isHovered ? color : `${color}99`,
                    ...(isOutlier ? {
                      background: `linear-gradient(to top, ${isHovered ? color : `${color}99`}, ${color}40)`,
                    } : {}),
                  }}
                />
              </div>
              <div style={{
                ...styles.barLabel,
                color: isHovered ? COLORS.text : COLORS.textDim,
              }}>
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 24,
  },
  chart: {
    flex: 1,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: 20,
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleGroup: {
    display: 'flex',
    gap: 2,
    background: COLORS.bg,
    borderRadius: 4,
    padding: 2,
  },
  toggleBtn: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: COLORS.textDim,
    background: 'transparent',
    border: 'none',
    borderRadius: 3,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: COLORS.surfaceHover,
    color: COLORS.text,
  },
  barsContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 4,
    height: 160,
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    cursor: 'default',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: '3px 3px 0 0',
    transition: 'background-color 0.15s, height 0.3s',
    minHeight: 2,
  },
  barLabel: {
    fontFamily: FONT.mono,
    fontSize: 9,
    marginTop: 6,
    whiteSpace: 'nowrap',
  },
  tooltip: {
    position: 'absolute',
    top: -8,
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.text,
    background: COLORS.surfaceHover,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '2px 8px',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
};
