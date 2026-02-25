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
        <div style={styles.empty}>No planned workouts</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Upcoming Workouts</div>
      <div style={styles.list}>
        {workouts.map((w) => (
          <div key={w.id} style={styles.row}>
            <div
              style={{
                ...styles.colorBar,
                backgroundColor: getActivityColor(w.activity_type),
              }}
            />
            <div style={styles.info}>
              <div style={styles.workoutTitle}>{w.title}</div>
              <div style={styles.workoutDate}>{formatDate(w.start_time)}</div>
              {w.description && (
                <div style={styles.workoutDesc}>
                  {w.description.length > 80
                    ? w.description.slice(0, 80) + '...'
                    : w.description}
                </div>
              )}
            </div>
          </div>
        ))}
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
  workoutTitle: {
    fontFamily: FONT.mono,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
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
  empty: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
    textAlign: 'center',
    padding: '24px 0',
  },
};
