import React, { useCallback } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { COLORS, FONT, RADIUS } from '@features/web-dashboard/styles';
import type { TrainingPhase } from '@domain/types/plan';

const PHASE_COLORS: Record<string, string> = {
  base: '#3b82f6',
  build: '#f59e0b',
  peak: '#ef4444',
  taper: '#22c55e',
  recovery: '#8b5cf6',
  race: '#f97316',
  custom: '#64748b',
};

interface PhaseBarProps {
  phase: TrainingPhase;
  viewStartDate: Date;
  totalDays: number;
  onEdit: (phase: TrainingPhase) => void;
  onDelete: (phase: TrainingPhase) => void;
}

export function PhaseBar({ phase, viewStartDate, totalDays, onEdit, onDelete }: PhaseBarProps) {
  const phaseStart = parseISO(phase.start_date);
  const phaseEnd = parseISO(phase.end_date);

  const startOffset = Math.max(0, differenceInDays(phaseStart, viewStartDate));
  const endOffset = Math.min(totalDays, differenceInDays(phaseEnd, viewStartDate) + 1);

  if (endOffset <= 0 || startOffset >= totalDays) return null;

  const leftPct = (startOffset / totalDays) * 100;
  const widthPct = ((endOffset - startOffset) / totalDays) * 100;
  const color = phase.color || PHASE_COLORS[phase.phase_type] || PHASE_COLORS.custom;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const action = window.prompt(
      `Phase: ${phase.title}\nType: ${phase.phase_type}\n${phase.start_date} \u2192 ${phase.end_date}\n\n1 = Edit\n2 = Delete\n\nEnter number:`
    );
    if (action === '1') onEdit(phase);
    else if (action === '2') onDelete(phase);
  }, [phase, onEdit, onDelete]);

  return (
    <div
      style={{
        ...styles.bar,
        left: `calc(64px + ${leftPct}% * (100% - 64px) / 100)`,
        width: `calc(${widthPct}% * (100% - 64px) / 100)`,
        backgroundColor: `${color}30`,
        borderColor: color,
      }}
      onContextMenu={handleContextMenu}
      onClick={() => onEdit(phase)}
      title={`${phase.title} (${phase.phase_type})\n${phase.start_date} \u2192 ${phase.end_date}`}
    >
      <span style={{ ...styles.label, color }}>{phase.title}</span>
      <span style={styles.dates}>
        {format(phaseStart, 'MMM d')} \u2013 {format(phaseEnd, 'MMM d')}
      </span>
    </div>
  );
}

interface PhaseBarAreaProps {
  phases: TrainingPhase[];
  viewStartDate: Date;
  totalDays: number;
  onEditPhase: (phase: TrainingPhase) => void;
  onDeletePhase: (phase: TrainingPhase) => void;
}

export function PhaseBarArea({
  phases,
  viewStartDate,
  totalDays,
  onEditPhase,
  onDeletePhase,
}: PhaseBarAreaProps) {
  if (!phases.length) return null;

  // Group: parents first, then children
  const parents = phases.filter(p => !p.parent_phase_id);
  const children = phases.filter(p => p.parent_phase_id);

  return (
    <div style={styles.area}>
      {[parents, children].map((group, gi) =>
        group.length > 0 ? (
          <div key={gi} style={styles.row}>
            {group.map(phase => (
              <PhaseBar
                key={phase.id}
                phase={phase}
                viewStartDate={viewStartDate}
                totalDays={totalDays}
                onEdit={onEditPhase}
                onDelete={onDeletePhase}
              />
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  area: {
    padding: '8px 0',
    marginBottom: 4,
  },
  row: {
    position: 'relative',
    height: 28,
    marginBottom: 2,
  },
  bar: {
    position: 'absolute',
    top: 0,
    height: 26,
    borderRadius: RADIUS.sm,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'opacity 0.15s',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: FONT.mono,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dates: {
    fontSize: 9,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    whiteSpace: 'nowrap',
    marginLeft: 8,
    flexShrink: 0,
  },
};
