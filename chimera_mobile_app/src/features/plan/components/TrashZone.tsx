import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { COLORS, FONT, RADIUS } from '@features/web-dashboard/styles';

interface TrashZoneProps {
  active: boolean; // only show during drag
}

export function TrashZone({ active }: TrashZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash-zone',
    data: { type: 'trash' },
  });

  if (!active) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.zone,
        ...(isOver ? styles.over : {}),
      }}
    >
      <span style={styles.icon}>{isOver ? '\uD83D\uDDD1\uFE0F' : '\uD83D\uDDD1'}</span>
      <span style={styles.text}>{isOver ? 'Release to delete' : 'Drop here to delete'}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zone: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: `${COLORS.red}15`,
    borderTop: `2px solid ${COLORS.red}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 100,
    transition: 'all 0.2s',
  },
  over: {
    backgroundColor: `${COLORS.red}30`,
    borderTopColor: COLORS.red,
    height: 72,
  },
  icon: {
    fontSize: 20,
  },
  text: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.red,
    fontFamily: FONT.mono,
  },
};
