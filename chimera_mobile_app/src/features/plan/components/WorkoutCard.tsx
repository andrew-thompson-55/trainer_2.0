import React, { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { COLORS, FONT, RADIUS, ACTIVITY_COLORS } from '@features/web-dashboard/styles';
import type { Workout } from '@domain/types';

interface WorkoutCardProps {
  workout: Workout;
  onEdit: (workout: Workout) => void;
  onDuplicate: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
}

export function WorkoutCard({ workout, onEdit, onDuplicate, onDelete }: WorkoutCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workout-${workout.id}`,
    data: { type: 'workout', workout },
  });

  const borderColor = ACTIVITY_COLORS[workout.activity_type] || ACTIVITY_COLORS.default;
  const isCompleted = workout.status === 'completed';

  const style: React.CSSProperties = {
    ...styles.card,
    borderLeftColor: borderColor,
    opacity: isDragging ? 0.5 : isCompleted ? 0.75 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Simple context menu via prompt-style approach
    // In production, replace with a proper dropdown
    const action = window.prompt(
      `${workout.title}\n\n1 = Edit\n2 = Duplicate\n3 = Delete\n\nEnter number:`
    );
    if (action === '1') onEdit(workout);
    else if (action === '2') onDuplicate(workout);
    else if (action === '3') onDelete(workout);
  }, [workout, onEdit, onDuplicate, onDelete]);

  const startTime = workout.start_time
    ? format(parseISO(workout.start_time), 'h:mm a')
    : '';

  const duration = workout.start_time && workout.end_time
    ? Math.round(
        (parseISO(workout.end_time).getTime() - parseISO(workout.start_time).getTime()) / 60000
      )
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={handleContextMenu}
      {...attributes}
      {...listeners}
    >
      <div style={styles.topRow}>
        <span style={styles.time}>{startTime}</span>
        {isCompleted && <span style={styles.check}>&#10003;</span>}
      </div>
      <div style={styles.title}>{workout.title}</div>
      <div style={styles.meta}>
        {workout.activity_type}
        {duration ? ` \u00B7 ${duration}min` : ''}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderLeft: '3px solid',
    padding: '6px 8px',
    marginBottom: 4,
    minHeight: 52,
    transition: 'opacity 0.15s',
    userSelect: 'none',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  time: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
  },
  check: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: 700,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.text,
    fontFamily: FONT.sans,
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    textTransform: 'capitalize' as const,
    marginTop: 2,
  },
};
