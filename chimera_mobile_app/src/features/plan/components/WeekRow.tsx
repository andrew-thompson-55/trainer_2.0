import React, { useCallback } from 'react';
import { format, getWeek } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';
import { DayCell } from './DayCell';
import type { WeekData } from '../hooks/useTrainingPlan';
import type { Workout } from '@domain/types';

interface WeekRowProps {
  week: WeekData;
  onEditWorkout: (workout: Workout) => void;
  onDuplicateWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workout: Workout) => void;
  onAddWorkout: (date: string) => void;
  onDuplicateWeek: (weekStart: string) => void;
  onClearWeek: (weekStart: string) => void;
  onSaveTemplate: (weekStart: string) => void;
}

export function WeekRow({
  week,
  onEditWorkout,
  onDuplicateWorkout,
  onDeleteWorkout,
  onAddWorkout,
  onDuplicateWeek,
  onClearWeek,
  onSaveTemplate,
}: WeekRowProps) {
  const weekNum = getWeek(week.weekStart, { weekStartsOn: 1 });
  const workoutCount = week.days.reduce((sum, d) => sum + d.workouts.length, 0);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const action = window.prompt(
      `Week ${weekNum} (${workoutCount} workouts)\n\n1 = Duplicate Week\n2 = Clear Week\n3 = Save as Template\n\nEnter number:`
    );
    if (action === '1') onDuplicateWeek(week.weekKey);
    else if (action === '2') onClearWeek(week.weekKey);
    else if (action === '3') onSaveTemplate(week.weekKey);
  }, [weekNum, workoutCount, week.weekKey, onDuplicateWeek, onClearWeek, onSaveTemplate]);

  return (
    <div style={styles.row}>
      <div style={styles.label} onContextMenu={handleContextMenu}>
        <span style={styles.weekNum}>WK {weekNum}</span>
        <span style={styles.weekDate}>{format(week.weekStart, 'MMM d')}</span>
        <span style={styles.count}>{workoutCount}</span>
      </div>
      <div style={styles.days}>
        {week.days.map((day, i) => (
          <DayCell
            key={day.dateKey}
            day={day}
            dayIndex={i}
            onEditWorkout={onEditWorkout}
            onDuplicateWorkout={onDuplicateWorkout}
            onDeleteWorkout={onDeleteWorkout}
            onAddWorkout={onAddWorkout}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  label: {
    width: 64,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.md,
    gap: 2,
    cursor: 'context-menu',
  },
  weekNum: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.textMuted,
    fontFamily: FONT.mono,
  },
  weekDate: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
  },
  count: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: '1px 6px',
    marginTop: 2,
  },
  days: {
    flex: 1,
    display: 'flex',
    gap: 4,
  },
};
