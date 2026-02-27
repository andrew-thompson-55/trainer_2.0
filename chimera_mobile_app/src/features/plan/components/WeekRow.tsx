import React, { useCallback } from 'react';
import { format, getWeek, isBefore, startOfDay } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';
import { DayCell } from './DayCell';
import type { WeekData } from '../hooks/useTrainingPlan';
import type { Workout } from '@domain/types';

interface WeekRowProps {
  week: WeekData;
  weekStartDay: 0 | 1;
  dayNames: string[];
  isCurrentWeek?: boolean;
  onEditWorkout: (workout: Workout, anchorRect: DOMRect) => void;
  onDuplicateWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workout: Workout) => void;
  onAddWorkout: (date: string) => void;
  onDuplicateWeek: (weekStart: string) => void;
  onClearWeek: (weekStart: string) => void;
  onSaveTemplate: (weekStart: string) => void;
}

export function WeekRow({
  week,
  weekStartDay,
  dayNames,
  isCurrentWeek,
  onEditWorkout,
  onDuplicateWorkout,
  onDeleteWorkout,
  onAddWorkout,
  onDuplicateWeek,
  onClearWeek,
  onSaveTemplate,
}: WeekRowProps) {
  const weekNum = getWeek(week.weekStart, { weekStartsOn: weekStartDay });
  const workoutCount = week.days.reduce((sum, d) => sum + d.workouts.length, 0);
  const today = startOfDay(new Date());
  const isPastWeek = isBefore(week.days[6].date, today);

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
    <div style={{
      ...styles.row,
      ...(isCurrentWeek ? styles.currentWeekRow : {}),
    }}>
      <div style={styles.label} onContextMenu={handleContextMenu}>
        <span style={styles.weekNum}>WK {weekNum}</span>
        <span style={styles.weekDate}>{format(week.weekStart, 'MMM d')}</span>
        <span style={styles.count}>{workoutCount}</span>
        {isCurrentWeek && <span style={styles.thisWeek}>THIS WEEK</span>}
      </div>
      <div style={styles.days}>
        {week.days.map((day, i) => (
          <DayCell
            key={day.dateKey}
            day={day}
            dayIndex={i}
            dayNames={dayNames}
            onEditWorkout={onEditWorkout}
            onDuplicateWorkout={onDuplicateWorkout}
            onDeleteWorkout={onDeleteWorkout}
            onAddWorkout={onAddWorkout}
            isPast={isPastWeek}
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
  currentWeekRow: {
    borderLeft: '3px solid #3b82f6',
    paddingLeft: SPACING.xs,
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
  thisWeek: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.accent,
    fontFamily: FONT.mono,
    letterSpacing: '0.5px',
    marginTop: 4,
  },
  days: {
    flex: 1,
    display: 'flex',
    gap: 4,
  },
};
