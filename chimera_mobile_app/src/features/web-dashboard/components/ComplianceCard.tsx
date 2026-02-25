import React from 'react';
import { COLORS, FONT, RADIUS } from '../styles';
import type { ComplianceData } from '@domain/types/dashboard';

interface ComplianceCardProps {
  compliance: ComplianceData;
}

export function ComplianceCard({ compliance }: ComplianceCardProps) {
  const { score, compliant_days, total_days, current_week } = compliance;

  const scoreColor =
    score >= 80 ? COLORS.green :
    score >= 60 ? COLORS.orange :
    COLORS.red;

  const scoreBg =
    score >= 80 ? COLORS.greenDim :
    score >= 60 ? `${COLORS.orange}20` :
    COLORS.redDim;

  return (
    <div style={styles.container}>
      <div style={styles.title}>Plan Compliance</div>

      {/* Score */}
      <div style={styles.scoreRow}>
        <span style={{ ...styles.score, color: scoreColor }}>{score}%</span>
        <span style={styles.fraction}>{compliant_days}/{total_days} days</span>
      </div>

      {/* Progress bar */}
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${Math.min(score, 100)}%`,
            backgroundColor: scoreColor,
          }}
        />
      </div>

      {/* Current week */}
      {current_week.total > 0 && (
        <div style={styles.weekRow}>
          <span style={styles.weekLabel}>This week</span>
          <span style={styles.weekValue}>
            {current_week.compliant}/{current_week.total}
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: 20,
  },
  title: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 10,
  },
  score: {
    fontFamily: FONT.mono,
    fontSize: 32,
    fontWeight: 700,
  },
  fraction: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
  },
  barTrack: {
    width: '100%',
    height: 8,
    background: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  weekRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekLabel: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.textDim,
  },
  weekValue: {
    fontFamily: FONT.mono,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.text,
  },
};
