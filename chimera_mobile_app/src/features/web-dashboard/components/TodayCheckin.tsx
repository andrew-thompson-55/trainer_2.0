import React from 'react';
import { COLORS, FONT, RADIUS } from '../styles';
import type { TodayCheckin as TodayCheckinType } from '@domain/types/dashboard';

interface TodayCheckinProps {
  checkin: TodayCheckinType | null;
  streak: number;
}

const LABELS = [
  { key: 'readiness', label: 'Readiness', emoji: ['', '\u{1F634}', '\u{1F610}', '\u{1F642}', '\u{1F4AA}', '\u{1F525}'] },
  { key: 'energy', label: 'Energy', emoji: ['', '\u{1FAAB}', '\u{1F611}', '\u{26A1}', '\u{1F50B}', '\u{26A1}\u{26A1}'] },
  { key: 'soreness', label: 'Soreness', emoji: ['', '\u{1F616}', '\u{1F623}', '\u{1F610}', '\u{1F60C}', '\u{2728}'] },
  { key: 'mood', label: 'Mood', emoji: ['', '\u{1F61E}', '\u{1F615}', '\u{1F60A}', '\u{1F604}', '\u{1F929}'] },
] as const;

export function TodayCheckin({ checkin, streak }: TodayCheckinProps) {
  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.title}>{"Today's Check-in"}</div>
        {streak > 0 && (
          <div style={styles.streak}>
            {streak}d streak
          </div>
        )}
      </div>
      {checkin ? (
        <div style={styles.grid}>
          {LABELS.map(({ key, label, emoji }) => {
            const val = checkin[key as keyof TodayCheckinType];
            return (
              <div key={key} style={styles.cell}>
                <div style={styles.emoji}>{emoji[val] || '--'}</div>
                <div style={styles.cellLabel}>{label}</div>
                <div style={styles.cellValue}>{val}/5</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.empty}>No check-in yet today</div>
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streak: {
    fontFamily: FONT.mono,
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.orange,
    background: `${COLORS.orange}15`,
    padding: '4px 10px',
    borderRadius: 20,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  cell: {
    textAlign: 'center' as const,
    padding: 12,
    background: COLORS.bg,
    borderRadius: RADIUS.sm,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  cellLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cellValue: {
    fontFamily: FONT.mono,
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.text,
    marginTop: 2,
  },
  empty: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
    textAlign: 'center',
    padding: '24px 0',
  },
};
