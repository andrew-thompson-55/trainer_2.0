import React from 'react';
import { COLORS, FONT } from '../styles';
import { daysUntil } from '../utils';

interface HeaderProps {
  race: { name: string; date: string } | null;
}

export function Header({ race }: HeaderProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const countdown = race ? daysUntil(race.date) : null;

  return (
    <div style={styles.container}>
      <div>
        <div style={styles.date}>{dateStr}</div>
        <div style={styles.title}>Dashboard</div>
      </div>
      {race && countdown !== null && countdown > 0 && (
        <div style={styles.raceBox}>
          <div style={styles.raceName}>{race.name}</div>
          <div style={styles.countdown}>
            <span style={styles.countdownNumber}>{countdown}</span>
            <span style={styles.countdownLabel}> days</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  date: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: FONT.mono,
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.text,
    marginTop: 4,
  },
  raceBox: {
    textAlign: 'right' as const,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: '12px 20px',
  },
  raceName: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdown: {
    fontFamily: FONT.mono,
    marginTop: 2,
  },
  countdownNumber: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.accent,
  },
  countdownLabel: {
    fontSize: 14,
    color: COLORS.textDim,
  },
};
