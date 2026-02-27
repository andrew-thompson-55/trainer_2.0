// PhaseColumn - Vertical phase brackets displayed to the left of the calendar grid
// Each phase renders as a colored vertical bar spanning its week rows

import React, { useState, useCallback } from 'react';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { COLORS, FONT, RADIUS } from '@features/web-dashboard/styles';
import type { TrainingPhase } from '@domain/types/plan';
import type { WeekData } from '../hooks/useTrainingPlan';

const PHASE_COLORS: Record<string, string> = {
  base: '#3b82f6',
  build: '#f59e0b',
  peak: '#ef4444',
  taper: '#22c55e',
  recovery: '#8b5cf6',
  race: '#f97316',
  custom: '#64748b',
};

const COLUMN_WIDTH = 140;
const BAR_WIDTH = 4;
const PARENT_OFFSET = 8;
const CHILD_OFFSET = 28;

interface PhaseColumnProps {
  phases: TrainingPhase[];
  weeks: WeekData[];
  weekRowHeight: number; // estimated or measured height per week row
  weekStartDay: 0 | 1;
  onEditPhase: (phase: TrainingPhase) => void;
  onDeletePhase: (phase: TrainingPhase) => void;
}

interface PhaseSegment {
  phase: TrainingPhase;
  startWeekIdx: number;
  endWeekIdx: number;
  isChild: boolean;
}

export function PhaseColumn({
  phases,
  weeks,
  weekRowHeight,
  weekStartDay,
  onEditPhase,
  onDeletePhase,
}: PhaseColumnProps) {
  const [hoveredPhaseId, setHoveredPhaseId] = useState<string | null>(null);

  if (!phases.length || !weeks.length) return <div style={{ width: COLUMN_WIDTH, flexShrink: 0 }} />;

  // Build segments: map each phase to the range of week indices it spans
  const segments: PhaseSegment[] = [];
  for (const phase of phases) {
    const phaseStart = parseISO(phase.start_date);
    const phaseEnd = parseISO(phase.end_date);

    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < weeks.length; i++) {
      const weekStart = weeks[i].weekStart;
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: weekStartDay });

      // Phase overlaps this week if phase start <= week end AND phase end >= week start
      const overlaps = phaseStart <= weekEnd && phaseEnd >= weekStart;
      if (overlaps) {
        if (startIdx === -1) startIdx = i;
        endIdx = i;
      }
    }

    if (startIdx >= 0) {
      segments.push({
        phase,
        startWeekIdx: startIdx,
        endWeekIdx: endIdx,
        isChild: !!phase.parent_phase_id,
      });
    }
  }

  return (
    <div style={styles.column}>
      {segments.map(seg => {
        const color = seg.phase.color || PHASE_COLORS[seg.phase.phase_type] || PHASE_COLORS.custom;
        const top = seg.startWeekIdx * weekRowHeight;
        const height = (seg.endWeekIdx - seg.startWeekIdx + 1) * weekRowHeight - 4; // small gap
        const leftOffset = seg.isChild ? CHILD_OFFSET : PARENT_OFFSET;
        const isHovered = hoveredPhaseId === seg.phase.id;
        const isShortPhase = seg.endWeekIdx === seg.startWeekIdx;

        return (
          <PhaseSegmentBar
            key={seg.phase.id}
            phase={seg.phase}
            color={color}
            top={top}
            height={height}
            leftOffset={leftOffset}
            isHovered={isHovered}
            isShortPhase={isShortPhase}
            onMouseEnter={() => setHoveredPhaseId(seg.phase.id)}
            onMouseLeave={() => setHoveredPhaseId(null)}
            onEdit={onEditPhase}
            onDelete={onDeletePhase}
          />
        );
      })}
    </div>
  );
}

interface PhaseSegmentBarProps {
  phase: TrainingPhase;
  color: string;
  top: number;
  height: number;
  leftOffset: number;
  isHovered: boolean;
  isShortPhase: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onEdit: (phase: TrainingPhase) => void;
  onDelete: (phase: TrainingPhase) => void;
}

function PhaseSegmentBar({
  phase,
  color,
  top,
  height,
  leftOffset,
  isHovered,
  isShortPhase,
  onMouseEnter,
  onMouseLeave,
  onEdit,
  onDelete,
}: PhaseSegmentBarProps) {
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
        position: 'absolute',
        top,
        left: leftOffset,
        height: Math.max(height, 20),
        display: 'flex',
        alignItems: 'stretch',
        cursor: 'pointer',
        zIndex: isHovered ? 10 : 1,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onEdit(phase)}
      onContextMenu={handleContextMenu}
      title={`${phase.title} (${phase.phase_type})\n${phase.start_date} \u2192 ${phase.end_date}`}
    >
      {/* Vertical colored bar */}
      <div style={{
        width: BAR_WIDTH,
        backgroundColor: color,
        borderRadius: BAR_WIDTH / 2,
        flexShrink: 0,
        opacity: isHovered ? 1 : 0.8,
        transition: 'opacity 0.15s',
      }} />

      {/* Label */}
      <div style={{
        marginLeft: 6,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        maxWidth: COLUMN_WIDTH - leftOffset - BAR_WIDTH - 16,
      }}>
        {isShortPhase ? (
          // Rotate text for single-week phases
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color,
            fontFamily: FONT.mono,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            maxHeight: height,
          }}>
            {phase.title}
          </span>
        ) : (
          <>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color,
              fontFamily: FONT.mono,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {phase.title}
            </span>
            <span style={{
              fontSize: 9,
              color: COLORS.textDim,
              fontFamily: FONT.mono,
              marginTop: 2,
            }}>
              {format(parseISO(phase.start_date), 'MMM d')} &ndash; {format(parseISO(phase.end_date), 'MMM d')}
            </span>
          </>
        )}
      </div>

      {/* Tooltip on hover */}
      {isHovered && (
        <div style={styles.tooltip}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{phase.title}</div>
          <div style={{ textTransform: 'capitalize' }}>{phase.phase_type}</div>
          <div>{format(parseISO(phase.start_date), 'MMM d')} &ndash; {format(parseISO(phase.end_date), 'MMM d, yyyy')}</div>
          {phase.notes && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{phase.notes}</div>}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  column: {
    width: COLUMN_WIDTH,
    flexShrink: 0,
    position: 'relative',
    minHeight: '100%',
  },
  tooltip: {
    position: 'absolute',
    left: COLUMN_WIDTH - 20,
    top: 0,
    backgroundColor: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    padding: '8px 10px',
    fontSize: 11,
    color: COLORS.text,
    fontFamily: FONT.mono,
    zIndex: 100,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  },
};
