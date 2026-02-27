import React, { useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';

interface PlanHeaderProps {
  onGoToToday: () => void;
  onJumpToDate: (date: Date) => void;
  onAddWorkout: () => void;
  onImport: () => void;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  showAgentLog: boolean;
  onToggleAgentLog: () => void;
  loadingMore?: boolean;
}

export function PlanHeader({
  onGoToToday,
  onJumpToDate,
  onAddWorkout,
  onImport,
  showTemplates,
  onToggleTemplates,
  showAgentLog,
  onToggleAgentLog,
  loadingMore,
}: PlanHeaderProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      onJumpToDate(new Date(val + 'T00:00:00'));
    }
  }, [onJumpToDate]);

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>Training Plan</h1>
        <div style={styles.nav}>
          <button style={styles.todayBtn} onClick={onGoToToday}>Today</button>
          <div style={styles.datePickerWrap}>
            <label style={styles.jumpLabel}>Jump to:</label>
            <input
              ref={dateInputRef}
              type="date"
              style={styles.dateInput}
              onChange={handleDateChange}
              defaultValue={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          {loadingMore && <span style={styles.loadingIndicator}>Loading...</span>}
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
  todayBtn: {
    background: 'none',
    border: `1px solid ${COLORS.accent}`,
    borderRadius: RADIUS.sm,
    color: COLORS.accent,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT.mono,
  },
  datePickerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  jumpLabel: {
    fontSize: 12,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
  },
  dateInput: {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '4px 8px',
    fontSize: 13,
    fontFamily: FONT.mono,
    cursor: 'pointer',
    colorScheme: 'dark',
  },
  loadingIndicator: {
    fontSize: 11,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    marginLeft: 8,
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
