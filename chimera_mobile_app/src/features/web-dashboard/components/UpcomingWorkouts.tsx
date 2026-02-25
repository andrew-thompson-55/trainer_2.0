import React from 'react';
import { COLORS, FONT, RADIUS, getActivityColor } from '../styles';
import { formatDate } from '../utils';
import type { UpcomingWorkout } from '@domain/types/dashboard';

interface UpcomingWorkoutsProps {
  workouts: UpcomingWorkout[];
}

export function UpcomingWorkouts({ workouts }: UpcomingWorkoutsProps) {
  if (!workouts.length) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Upcoming Workouts</div>
        <div style={styles.emptyState}>
          <div style={styles.emptyText}>No plan loaded</div>
          <div style={styles.emptyActions}>
            <span style={styles.emptyLink}>Import Plan</span>
            <span style={styles.emptyDivider}>·</span>
            <span style={styles.emptyLink}>Add Workout</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Upcoming Workouts</div>
      <div style={styles.list}>
        {workouts.map((w) => {
          const isRest = w.activity_type.toLowerCase().includes('rest');
          const isCompleted = w.status === 'completed';

          return (
            <div
              key={w.id}
              style={{
                ...styles.row,
                ...(w.is_today ? styles.todayRow : {}),
                ...(isCompleted ? styles.completedRow : {}),
              }}
            >
              <div
                style={{
                  ...styles.colorBar,
                  backgroundColor: isRest ? COLORS.textDim : getActivityColor(w.activity_type),
                }}
              />
              <div style={styles.info}>
                <div style={styles.workoutHeader}>
                  <div style={{
                    ...styles.workoutTitle,
                    ...(isCompleted ? styles.completedText : {}),
                  }}>
                    {w.title}
                  </div>
                  {w.is_today && (
                    <span style={styles.todayBadge}>TODAY</span>
                  )}
                  {isCompleted && (
                    <span style={styles.completedBadge}>DONE</span>
                  )}
                </div>
                <div style={styles.workoutDate}>{formatDate(w.start_time)}</div>
                {w.is_today && w.description && (
                  <div style={styles.workoutDesc}>{w.description}</div>
                )}
                {!w.is_today && w.description && (
                  <div style={styles.workoutDesc}>
                    {w.description.length > 80
                      ? w.description.slice(0, 80) + '...'
                      : w.description}
                  </div>
                )}
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
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 6,
    background: COLORS.bg,
  },
  todayRow: {
    border: `1px solid ${COLORS.green}40`,
    background: `${COLORS.greenDim}30`,
  },
  completedRow: {
    opacity: 0.6,
  },
  colorBar: {
    width: 3,
    borderRadius: 2,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  workoutHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  workoutTitle: {
    fontFamily: FONT.mono,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
  },
  completedText: {
    textDecoration: 'line-through',
    color: COLORS.textDim,
  },
  todayBadge: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.green,
    background: `${COLORS.greenDim}60`,
    padding: '1px 6px',
    borderRadius: 3,
    letterSpacing: 0.5,
  },
  completedBadge: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.textDim,
    background: COLORS.surfaceHover,
    padding: '1px 6px',
    borderRadius: 3,
    letterSpacing: 0.5,
  },
  workoutDate: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  workoutDesc: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: '1.4',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 0',
  },
  emptyText: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
    marginBottom: 8,
  },
  emptyActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  emptyLink: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.accent,
    cursor: 'pointer',
  },
  emptyDivider: {
    color: COLORS.textDim,
    fontSize: 12,
  },
};
