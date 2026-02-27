import React from 'react';
import { format } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';

interface PlanHeaderProps {
  currentStartDate: Date;
  onNavigateWeeks: (offset: number) => void;
  onGoToToday: () => void;
  onAddWorkout: () => void;
  onImport: () => void;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  showAgentLog: boolean;
  onToggleAgentLog: () => void;
}

export function PlanHeader({
  currentStartDate,
  onNavigateWeeks,
  onGoToToday,
  onAddWorkout,
  onImport,
  showTemplates,
  onToggleTemplates,
  showAgentLog,
  onToggleAgentLog,
}: PlanHeaderProps) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>Training Plan</h1>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => onNavigateWeeks(-5)}>&#9664;</button>
          <span style={styles.dateRange}>
            {format(currentStartDate, 'MMM d, yyyy')}
          </span>
          <button style={styles.navBtn} onClick={() => onNavigateWeeks(5)}>&#9654;</button>
          <button style={styles.todayBtn} onClick={onGoToToday}>Today</button>
        </div>
      </div>
      <div style={styles.right}>
        <button style={styles.toggleBtn} onClick={onImport}>
          Import
        </button>
        <button
          style={{
            ...styles.toggleBtn,
            ...(showTemplates ? styles.toggleActive : {}),
          }}
          onClick={onToggleTemplates}
        >
          Templates
        </button>
        <button
          style={{
            ...styles.toggleBtn,
            ...(showAgentLog ? styles.toggleActive : {}),
          }}
          onClick={onToggleAgentLog}
        >
          Agent Log
        </button>
        <button style={styles.addBtn} onClick={onAddWorkout}>+ Add Workout</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${SPACING.md}px ${SPACING.lg}px`,
    borderBottom: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.surface,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.text,
    fontFamily: FONT.sans,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  navBtn: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: FONT.mono,
  },
  dateRange: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONT.mono,
    minWidth: 130,
    textAlign: 'center' as const,
  },
  todayBtn: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.accent,
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: FONT.mono,
    marginLeft: SPACING.xs,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleBtn: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.textMuted,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: FONT.mono,
    transition: 'all 0.15s',
  },
  toggleActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
    color: COLORS.accent,
  },
  addBtn: {
    background: COLORS.accent,
    border: 'none',
    borderRadius: RADIUS.sm,
    color: '#fff',
    padding: '6px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT.mono,
  },
};
