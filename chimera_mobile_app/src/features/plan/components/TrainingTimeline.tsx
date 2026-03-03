// TrainingTimeline - Horizontal SVG chart showing weekly training volume, elevation, phases, and race markers
// Renders below the calendar grid on the Plan page with pan/zoom interactions

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, getWeek } from 'date-fns';
import { COLORS, FONT } from '@features/web-dashboard/styles';
import { useTimelineData } from '../hooks/useTimelineData';
import type { WeekData } from '../hooks/useTrainingPlan';
import type { CalendarActivity, TrainingPhase } from '@domain/types/plan';

interface TrainingTimelineProps {
  weeks: WeekData[];
  phases: TrainingPhase[];
  activities: CalendarActivity[];
  distanceUnit: 'mi' | 'km';
  weekStartDay: 0 | 1;
  onScrollToWeek: (date: Date) => void;
}

interface ViewportState {
  center: Date;
  weeksVisible: number;
}

interface TooltipData {
  x: number;
  y: number;
  weekStart: Date;
  volume: number;
  elevation: number;
  distanceUnit: string;
}

const COLLAPSED_HEIGHT = 36;
const EXPANDED_HEIGHT = 240;
const CHART_PADDING = { top: 28, bottom: 28, left: 48, right: 48 };
const PHASE_STRIP_HEIGHT = 16;
const MIN_WEEKS_VISIBLE = 4;
const MAX_WEEKS_VISIBLE = 52;
const BAR_COLOR = '#3b82f6';
const BAR_PAST_OPACITY = 0.85;
const BAR_FUTURE_OPACITY = 0.2;
const ELEVATION_COLOR = '#a855f7';
const TODAY_LINE_COLOR = '#f1f5f9';
const RACE_LINE_COLOR = '#f97316';
const DRAG_THRESHOLD = 5;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function TrainingTimeline({
  weeks,
  phases,
  activities,
  distanceUnit,
  weekStartDay,
  onScrollToWeek,
}: TrainingTimelineProps) {
  const [expanded, setExpanded] = useState(true);
  const [viewport, setViewport] = useState<ViewportState>(() => ({
    center: new Date(),
    weeksVisible: 16,
  }));
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; center: Date; moved: boolean } | null>(null);
  const specialClickRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const { timelineWeeks, phaseSegments, races, maxVolume, maxElevation } = useTimelineData(
    weeks, phases, activities, distanceUnit, weekStartDay
  );

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Chart geometry
  const chartWidth = containerWidth - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = EXPANDED_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom - PHASE_STRIP_HEIGHT;

  // Date-based viewport range (center ± half range)
  const halfRangeMs = (viewport.weeksVisible / 2) * MS_PER_WEEK;
  const leftEdgeMs = viewport.center.getTime() - halfRangeMs;
  const rightEdgeMs = viewport.center.getTime() + halfRangeMs;
  const totalMs = viewport.weeksVisible * MS_PER_WEEK;

  // Convert a date to an X pixel position
  const dateToX = (date: Date) => {
    return CHART_PADDING.left + ((date.getTime() - leftEdgeMs) / totalMs) * chartWidth;
  };

  // Bar width based on zoom level
  const barWidth = Math.max(4, (chartWidth / viewport.weeksVisible) * 0.7);

  // Filter timeline weeks to those visible in the current viewport
  const visibleWeekIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < timelineWeeks.length; i++) {
      const ws = timelineWeeks[i].weekStart.getTime();
      const we = ws + MS_PER_WEEK;
      if (we >= leftEdgeMs && ws <= rightEdgeMs) {
        indices.push(i);
      }
    }
    return indices;
  }, [timelineWeeks, leftEdgeMs, rightEdgeMs]);

  // Week boundary separators
  const weekBoundaries = useMemo(() => {
    let current = startOfWeek(new Date(leftEdgeMs - MS_PER_WEEK), { weekStartsOn: weekStartDay });
    const boundaries: { date: Date; weekNumber: number; label: string }[] = [];
    const rightMs = rightEdgeMs;
    while (current.getTime() <= rightMs) {
      if (current.getTime() >= leftEdgeMs) {
        boundaries.push({
          date: new Date(current),
          weekNumber: getWeek(current, { weekStartsOn: weekStartDay }),
          label: format(current, 'MMM d'),
        });
      }
      current = addDays(current, 7);
    }
    return boundaries;
  }, [leftEdgeMs, rightEdgeMs, weekStartDay]);

  // Label density for week separators
  const sepLabelInterval = useMemo(() => {
    if (viewport.weeksVisible <= 12) return 1;
    if (viewport.weeksVisible <= 24) return 2;
    if (viewport.weeksVisible <= 36) return 4;
    return 8;
  }, [viewport.weeksVisible]);

  // Scale helpers
  const volumeScale = maxVolume > 0 ? chartHeight * 0.85 / maxVolume : 0;
  const elevationScale = maxElevation > 0 ? chartHeight * 0.85 / maxElevation : 0;

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setViewport(prev => {
      const delta = e.deltaY > 0 ? 2 : -2;
      const newVisible = Math.max(MIN_WEEKS_VISIBLE, Math.min(MAX_WEEKS_VISIBLE, prev.weeksVisible + delta));
      return { ...prev, weeksVisible: newVisible };
    });
  }, []);

  // Mouse interactions with drag/click disambiguation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, center: viewport.center, moved: false };
  }, [viewport.center]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) >= DRAG_THRESHOLD) {
      start.moved = true;
      setIsDragging(true);
      const rangeMs = viewport.weeksVisible * MS_PER_WEEK;
      const msPerPx = rangeMs / chartWidth;
      const newCenter = new Date(start.center.getTime() - dx * msPerPx);
      setViewport(prev => ({ ...prev, center: newCenter }));
    }
  }, [viewport.weeksVisible, chartWidth]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const start = dragStartRef.current;
    if (start && !start.moved && !specialClickRef.current) {
      // Click — convert X position to a date
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left - CHART_PADDING.left;
        const halfMs = (viewport.weeksVisible / 2) * MS_PER_WEEK;
        const left = viewport.center.getTime() - halfMs;
        const range = viewport.weeksVisible * MS_PER_WEEK;
        const clickedDate = new Date(left + (clickX / chartWidth) * range);

        if (e.ctrlKey || e.metaKey) {
          // Extend viewport to include clicked date
          const diff = Math.abs(clickedDate.getTime() - viewport.center.getTime());
          const weeksToFit = Math.ceil(diff / MS_PER_WEEK) * 2 + 4;
          setViewport(prev => ({ ...prev, weeksVisible: Math.min(MAX_WEEKS_VISIBLE, Math.max(prev.weeksVisible, weeksToFit)) }));
        } else {
          // Center viewport on clicked date + scroll calendar
          setViewport(prev => ({ ...prev, center: clickedDate }));
          onScrollToWeek(clickedDate);
        }
      }
    }
    specialClickRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;
  }, [viewport.center, viewport.weeksVisible, chartWidth, onScrollToWeek]);

  // Phase click — fit entire phase in view
  const handlePhaseClick = useCallback((startIdx: number, endIdx: number, e: React.MouseEvent) => {
    specialClickRef.current = true;
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (midIdx >= 0 && midIdx < weeks.length) {
      const midDate = weeks[midIdx].weekStart;
      const span = endIdx - startIdx + 1;
      if (e.ctrlKey || e.metaKey) {
        setViewport(prev => ({
          center: midDate,
          weeksVisible: Math.min(MAX_WEEKS_VISIBLE, Math.max(prev.weeksVisible, span + 4)),
        }));
      } else {
        setViewport({ center: midDate, weeksVisible: Math.max(MIN_WEEKS_VISIBLE, span + 4) });
      }
      onScrollToWeek(midDate);
    }
  }, [weeks, onScrollToWeek]);

  // Race marker click
  const handleRaceClick = useCallback((weekIdx: number, e: React.MouseEvent) => {
    specialClickRef.current = true;
    if (weekIdx >= 0 && weekIdx < weeks.length) {
      const raceDate = weeks[weekIdx].weekStart;
      if (e.ctrlKey || e.metaKey) {
        const diff = Math.abs(raceDate.getTime() - viewport.center.getTime());
        const weeksToFit = Math.ceil(diff / MS_PER_WEEK) * 2 + 4;
        setViewport(prev => ({ ...prev, weeksVisible: Math.min(MAX_WEEKS_VISIBLE, Math.max(prev.weeksVisible, weeksToFit)) }));
      } else {
        setViewport(prev => ({ ...prev, center: raceDate }));
      }
      onScrollToWeek(raceDate);
    }
  }, [weeks, onScrollToWeek, viewport.center]);

  // Week separator click
  const handleWeekSepClick = useCallback((weekDate: Date) => {
    specialClickRef.current = true;
    setViewport(prev => ({ ...prev, center: weekDate }));
    onScrollToWeek(weekDate);
  }, [onScrollToWeek]);

  // Tooltip
  const handleBarHover = useCallback((e: React.MouseEvent, weekIdx: number) => {
    if (isDragging) return;
    const tw = timelineWeeks[weekIdx];
    if (!tw) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      weekStart: tw.weekStart,
      volume: tw.actualVolumeMi,
      elevation: tw.actualElevationFt,
      distanceUnit,
    });
  }, [isDragging, timelineWeeks, distanceUnit]);

  const handleBarLeave = useCallback(() => setTooltip(null), []);

  // Find today week index (for collapsed view progress text)
  const todayIdx = useMemo(() => {
    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i].isCurrentWeek) return i;
    }
    return -1;
  }, [weeks]);

  // Current phase for collapsed view
  const currentPhase = useMemo(() => {
    for (const seg of phaseSegments) {
      if (todayIdx >= seg.startWeekIdx && todayIdx <= seg.endWeekIdx) {
        return seg;
      }
    }
    return null;
  }, [phaseSegments, todayIdx]);

  // Week progress text for collapsed bar
  const weekProgress = useMemo(() => {
    if (!weeks.length) return '';
    const total = weeks.length;
    const currentIdx = todayIdx >= 0 ? todayIdx + 1 : '?';
    return `Week ${currentIdx} of ${total}`;
  }, [weeks.length, todayIdx]);

  // X-axis label interval
  const labelInterval = useMemo(() => {
    if (viewport.weeksVisible <= 8) return 1;
    if (viewport.weeksVisible <= 16) return 2;
    if (viewport.weeksVisible <= 32) return 4;
    return 8;
  }, [viewport.weeksVisible]);

  // Today position
  const now = new Date();
  const todayX = dateToX(now);
  const todayVisible = todayX >= CHART_PADDING.left && todayX <= containerWidth - CHART_PADDING.right;

  if (!weeks.length) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Collapsed bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          height: COLLAPSED_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          cursor: 'pointer',
          backgroundColor: COLORS.surface,
          borderBottom: expanded ? `1px solid ${COLORS.border}` : 'none',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.textDim, transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          &#9654;
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: FONT.mono }}>
          Training Timeline
        </span>
        {currentPhase && (
          <span style={{
            fontSize: 10,
            color: currentPhase.color,
            fontFamily: FONT.mono,
            backgroundColor: currentPhase.color + '1a',
            padding: '2px 8px',
            borderRadius: 4,
          }}>
            {currentPhase.phase.title}
          </span>
        )}
        <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT.mono, marginLeft: 'auto' }}>
          {weekProgress}
        </span>
      </div>

      {/* Expanded chart */}
      {expanded && (
        <div
          style={{
            height: EXPANDED_HEIGHT,
            backgroundColor: COLORS.bg,
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'pointer',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp({} as React.MouseEvent); handleBarLeave(); }}
        >
          <svg
            width={containerWidth}
            height={EXPANDED_HEIGHT}
            style={{ display: 'block' }}
          >
            {/* Hover styles for week separators */}
            <defs>
              <style>{`
                .week-sep rect.sep-line { transition: fill 0.15s; }
                .week-sep text { transition: fill 0.15s; }
                .week-sep:hover rect.sep-line { fill: #334155; }
                .week-sep:hover text { fill: #94a3b8; }
              `}</style>
            </defs>

            {/* Phase strip at top */}
            {phaseSegments.map(seg => {
              if (seg.startWeekIdx >= weeks.length || seg.endWeekIdx >= weeks.length) return null;
              const x1 = dateToX(weeks[seg.startWeekIdx].weekStart);
              const x2 = dateToX(addDays(weeks[seg.endWeekIdx].weekStart, 7));
              if (x2 < CHART_PADDING.left || x1 > containerWidth - CHART_PADDING.right) return null;
              const clampedX1 = Math.max(CHART_PADDING.left, x1);
              const clampedX2 = Math.min(containerWidth - CHART_PADDING.right, x2);
              return (
                <rect
                  key={seg.phase.id}
                  x={clampedX1}
                  y={4}
                  width={Math.max(0, clampedX2 - clampedX1)}
                  height={PHASE_STRIP_HEIGHT}
                  rx={3}
                  fill={seg.color}
                  opacity={0.6}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handlePhaseClick(seg.startWeekIdx, seg.endWeekIdx, e); }}
                >
                  <title>{seg.phase.title}</title>
                </rect>
              );
            })}

            {/* Week boundary separators */}
            {weekBoundaries.map((wb, i) => {
              const x = dateToX(wb.date);
              if (x < CHART_PADDING.left || x > containerWidth - CHART_PADDING.right) return null;
              const showLabel = i % sepLabelInterval === 0;
              const chartTop = CHART_PADDING.top + PHASE_STRIP_HEIGHT;
              return (
                <g
                  key={i}
                  className="week-sep"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleWeekSepClick(wb.date); }}
                >
                  {/* Vertical separator line */}
                  <rect
                    className="sep-line"
                    x={x - 1}
                    y={chartTop}
                    width={2}
                    height={chartHeight}
                    fill="#1e293b"
                  />
                  {showLabel && (
                    <>
                      {/* Date label at top */}
                      <text
                        x={x + 4}
                        y={chartTop - 2}
                        fill="#475569"
                        fontSize={8}
                        fontFamily={FONT.mono}
                      >
                        {wb.label}
                      </text>
                      {/* Week number rotated vertically */}
                      <text
                        x={x + 1}
                        y={chartTop + 14}
                        fill="#1e293b"
                        fontSize={9}
                        fontFamily={FONT.mono}
                        opacity={0.5}
                        transform={`rotate(90, ${x + 1}, ${chartTop + 14})`}
                        textAnchor="start"
                      >
                        WK {wb.weekNumber}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Horizontal gridlines */}
            {maxVolume > 0 && [0.25, 0.5, 0.75].map(frac => {
              const y = CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight - (chartHeight * 0.85 * frac);
              return (
                <line
                  key={frac}
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={containerWidth - CHART_PADDING.right}
                  y2={y}
                  stroke={COLORS.border}
                  strokeWidth={0.5}
                  strokeDasharray="4,4"
                />
              );
            })}

            {/* Volume bars */}
            {visibleWeekIndices.map(i => {
              const tw = timelineWeeks[i];
              const x = dateToX(tw.weekStart);
              const barHeight = tw.actualVolumeMi * volumeScale;
              const barY = CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight - barHeight;
              const opacity = tw.isPast || tw.isCurrentWeek ? BAR_PAST_OPACITY : BAR_FUTURE_OPACITY;

              return (
                <rect
                  key={`bar-${i}`}
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={Math.max(0, barHeight)}
                  rx={2}
                  fill={BAR_COLOR}
                  opacity={opacity}
                  onMouseMove={(e) => handleBarHover(e, i)}
                  onMouseLeave={handleBarLeave}
                />
              );
            })}

            {/* Elevation line (past only in v1) */}
            {maxElevation > 0 && (() => {
              const points: string[] = [];
              for (const i of visibleWeekIndices) {
                const tw = timelineWeeks[i];
                if (!tw.isPast && !tw.isCurrentWeek) continue;
                if (tw.actualElevationFt === 0) continue;
                const x = dateToX(tw.weekStart) + barWidth / 2;
                const y = CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight - (tw.actualElevationFt * elevationScale);
                points.push(`${x},${y}`);
              }
              if (points.length < 2) return null;
              return (
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={ELEVATION_COLOR}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })()}

            {/* Today line */}
            {todayVisible && (
              <>
                <line
                  x1={todayX}
                  y1={CHART_PADDING.top + PHASE_STRIP_HEIGHT - 4}
                  x2={todayX}
                  y2={CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight + 4}
                  stroke={TODAY_LINE_COLOR}
                  strokeWidth={2}
                  opacity={0.6}
                />
                <text
                  x={todayX}
                  y={CHART_PADDING.top + PHASE_STRIP_HEIGHT - 6}
                  textAnchor="middle"
                  fill={TODAY_LINE_COLOR}
                  fontSize={8}
                  fontFamily={FONT.mono}
                  fontWeight={600}
                  opacity={0.7}
                >
                  TODAY
                </text>
              </>
            )}

            {/* Race markers */}
            {races.map(race => {
              if (race.weekIdx >= weeks.length) return null;
              const x = dateToX(weeks[race.weekIdx].weekStart) + barWidth / 2;
              if (x < CHART_PADDING.left || x > containerWidth - CHART_PADDING.right) return null;
              return (
                <g
                  key={race.phase.id}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRaceClick(race.weekIdx, e); }}
                >
                  <line
                    x1={x}
                    y1={CHART_PADDING.top + PHASE_STRIP_HEIGHT}
                    x2={x}
                    y2={CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight}
                    stroke={RACE_LINE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="6,3"
                    opacity={0.8}
                  />
                  <text
                    x={x}
                    y={CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight + 16}
                    textAnchor="middle"
                    fill={RACE_LINE_COLOR}
                    fontSize={9}
                    fontFamily={FONT.mono}
                    fontWeight={600}
                  >
                    {race.phase.title.length > 10 ? race.phase.title.slice(0, 10) + '...' : race.phase.title}
                  </text>
                </g>
              );
            })}

            {/* X-axis date labels */}
            {visibleWeekIndices.map((i, arrIdx) => {
              if (arrIdx % labelInterval !== 0) return null;
              const tw = timelineWeeks[i];
              const x = dateToX(tw.weekStart) + barWidth / 2;
              return (
                <text
                  key={`label-${i}`}
                  x={x}
                  y={EXPANDED_HEIGHT - 4}
                  textAnchor="middle"
                  fill={COLORS.textDim}
                  fontSize={9}
                  fontFamily={FONT.mono}
                >
                  {format(tw.weekStart, 'MMM d')}
                </text>
              );
            })}

            {/* Y-axis left (volume) */}
            {maxVolume > 0 && (
              <>
                <text
                  x={4}
                  y={CHART_PADDING.top + PHASE_STRIP_HEIGHT + 10}
                  fill={BAR_COLOR}
                  fontSize={9}
                  fontFamily={FONT.mono}
                  opacity={0.7}
                >
                  {Math.round(maxVolume)} {distanceUnit}
                </text>
                <text
                  x={4}
                  y={CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight}
                  fill={BAR_COLOR}
                  fontSize={9}
                  fontFamily={FONT.mono}
                  opacity={0.5}
                >
                  0
                </text>
              </>
            )}

            {/* Y-axis right (elevation) */}
            {maxElevation > 0 && (
              <>
                <text
                  x={containerWidth - 4}
                  y={CHART_PADDING.top + PHASE_STRIP_HEIGHT + 10}
                  textAnchor="end"
                  fill={ELEVATION_COLOR}
                  fontSize={9}
                  fontFamily={FONT.mono}
                  opacity={0.7}
                >
                  {Math.round(maxElevation)} ft
                </text>
                <text
                  x={containerWidth - 4}
                  y={CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight}
                  textAnchor="end"
                  fill={ELEVATION_COLOR}
                  fontSize={9}
                  fontFamily={FONT.mono}
                  opacity={0.5}
                >
                  0
                </text>
              </>
            )}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                left: tooltip.x + 12,
                top: tooltip.y - 40,
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 11,
                color: COLORS.text,
                fontFamily: FONT.mono,
                pointerEvents: 'none',
                zIndex: 50,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                Week of {format(tooltip.weekStart, 'MMM d, yyyy')}
              </div>
              <div style={{ color: BAR_COLOR }}>
                Volume: {tooltip.volume.toFixed(1)} {tooltip.distanceUnit}
              </div>
              <div style={{ color: ELEVATION_COLOR }}>
                Elevation: {Math.round(tooltip.elevation)} ft
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
