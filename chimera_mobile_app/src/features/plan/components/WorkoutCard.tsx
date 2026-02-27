import React, { useCallback, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { COLORS, FONT, RADIUS, ACTIVITY_COLORS } from '@features/web-dashboard/styles';
import type { Workout } from '@domain/types';

interface WorkoutCardProps {
  workout: Workout;
  onEdit: (workout: Workout, anchorRect: DOMRect) => void;
  onDuplicate: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
  /** Render as overlay clone (elevated, no drag hooks) */
  isOverlay?: boolean;
}

export function WorkoutCard({ workout, onEdit, onDuplicate, onDelete, isOverlay }: WorkoutCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workout-${workout.id}`,
    data: { type: 'workout', workout },
    disabled: isOverlay,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const borderColor = ACTIVITY_COLORS[workout.activity_type] || ACTIVITY_COLORS.default;
  const isCompleted = workout.status === 'completed';
  const isTentative = workout.status === 'tentative';
  const isCancelled = workout.status === 'cancelled';

  // Ghost placeholder: original card while dragging
  const isGhost = isDragging && !isOverlay;

  const style: React.CSSProperties = {
    ...styles.card,
    borderLeftColor: borderColor,
    borderLeftStyle: isTentative ? 'dashed' : 'solid',
    ...(isOverlay ? {
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      transform: 'scale(1.03)',
      cursor: 'grabbing',
      opacity: isCancelled ? 0.4 : isCompleted ? 0.75 : 1,
    } : isGhost ? {
      opacity: 0.3,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: COLORS.textDim,
    } : {
      opacity: isCancelled ? 0.4 : isCompleted ? 0.75 : isTentative ? 0.7 : 1,
      transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
      cursor: 'grab',
    }),
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't fire click if this was a drag
    if (isDragging) return;
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) onEdit(workout, rect);
  }, [workout, onEdit, isDragging]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const action = window.prompt(
      `${workout.title}\n\n1 = Duplicate\n2 = Delete\n\nEnter number:`
    );
    if (action === '1') onDuplicate(workout);
    else if (action === '2') onDelete(workout);
  }, [workout, onDuplicate, onDelete]);

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
      ref={(node) => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
    >
      <div style={styles.topRow}>
        <span style={styles.time}>{startTime}</span>
        {isTentative && <span style={styles.badge}>?</span>}
        {isCancelled && <span style={styles.cancelled}>{'\u2717'}</span>}
        {isCompleted && <span style={styles.check}>&#10003;</span>}
      </div>
      <div style={{
        ...styles.title,
        ...(isCancelled ? { textDecoration: 'line-through' } : {}),
      }}>{workout.title}</div>
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
  badge: {
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: 700,
  },
  cancelled: {
    fontSize: 12,
    color: COLORS.textDim,
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
