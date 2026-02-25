import React from 'react';
import { COLORS, FONT, RADIUS } from '../styles';

interface WeekSummaryProps {
  runs: number;
  miles: number;
  vertFt: number;
  distanceUnit: 'mi' | 'km';
}

export function WeekSummary({ runs, miles, vertFt, distanceUnit }: WeekSummaryProps) {
  const isMi = distanceUnit === 'mi';

  return (
    <div style={styles.container}>
      <div style={styles.title}>This Week</div>
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{runs}</div>
          <div style={styles.statLabel}>runs</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <div style={styles.statValue}>
            {isMi ? miles.toFixed(1) : (miles * 1.60934).toFixed(1)}
          </div>
          <div style={styles.statLabel}>{isMi ? 'miles' : 'km'}</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <div style={styles.statValue}>
            {isMi ? vertFt.toLocaleString() : Math.round(vertFt / 3.28084).toLocaleString()}
          </div>
          <div style={styles.statLabel}>{isMi ? 'ft vert' : 'm vert'}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: 20,
    textAlign: 'center' as const,
  },
  title: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  stat: {},
  statValue: {
    fontFamily: FONT.mono,
    fontSize: 32,
    fontWeight: 700,
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    background: COLORS.border,
  },
};
