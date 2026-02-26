import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';
import { WorkoutCard } from './WorkoutCard';
import type { DayData } from '../hooks/useTrainingPlan';
import type { Workout } from '@domain/types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayCellProps {
  day: DayData;
  dayIndex: number;
  onEditWorkout: (workout: Workout) => void;
  onDuplicateWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workout: Workout) => void;
  onAddWorkout: (date: string) => void;
}

export function DayCell({
  day,
  dayIndex,
  onEditWorkout,
  onDuplicateWorkout,
  onDeleteWorkout,
  onAddWorkout,
}: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.dateKey}`,
    data: { type: 'day', dateKey: day.dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.cell,
        ...(day.isToday ? styles.todayCell : {}),
        ...(isOver ? styles.overCell : {}),
      }}
    >
      <div style={{
        ...styles.dayHeader,
        ...(day.isToday ? styles.todayHeader : {}),
      }}>
        <span style={{
          ...styles.dayName,
          ...(day.isToday ? styles.todayText : {}),
        }}>
          {DAY_NAMES[dayIndex]}
        </span>
        <span style={{
          ...styles.dayNum,
          ...(day.isToday ? styles.todayText : {}),
        }}>
          {format(day.date, 'd')}
        </span>
      </div>
      <div style={styles.workouts}>
        {day.workouts.map(w => (
          <WorkoutCard
            key={w.id}
            workout={w}
            onEdit={onEditWorkout}
            onDuplicate={onDuplicateWorkout}
            onDelete={onDeleteWorkout}
          />
        ))}
        <button
          style={styles.addBtn}
          onClick={() => onAddWorkout(day.dateKey)}
          title="Add workout"
        >
          +
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cell: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.15s',
  },
  todayCell: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  overCell: {
    borderColor: COLORS.green,
    backgroundColor: `${COLORS.green}08`,
  },
  dayHeader: {
    padding: '6px 8px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  todayHeader: {
    backgroundColor: COLORS.accentDim,
  },
  dayName: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  dayNum: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.text,
    fontFamily: FONT.mono,
  },
  todayText: {
    color: COLORS.accent,
  },
  workouts: {
    flex: 1,
    padding: 4,
    minHeight: 80,
    display: 'flex',
    flexDirection: 'column',
  },
  addBtn: {
    marginTop: 'auto',
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px',
    borderRadius: RADIUS.sm,
    opacity: 0.4,
    transition: 'opacity 0.15s',
    textAlign: 'center' as const,
  },
};
