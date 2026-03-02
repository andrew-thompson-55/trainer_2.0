// TrainingTimeline - Horizontal SVG chart showing weekly training volume, elevation, phases, and race markers
// Renders below the calendar grid on the Plan page with pan/zoom interactions

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { format, differenceInCalendarWeeks, startOfWeek } from 'date-fns';
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
  const dragStartRef = useRef<{ x: number; center: Date } | null>(null);
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

  // Visible week range
  const visibleRange = useMemo(() => {
    if (!weeks.length) return { startIdx: 0, endIdx: 0 };
    const halfVisible = viewport.weeksVisible / 2;
    const centerWeekStart = startOfWeek(viewport.center, { weekStartsOn: weekStartDay });

    // Find index of center week
    let centerIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < weeks.length; i++) {
      const diff = Math.abs(weeks[i].weekStart.getTime() - centerWeekStart.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        centerIdx = i;
      }
    }

    const startIdx = Math.max(0, Math.round(centerIdx - halfVisible));
    const endIdx = Math.min(weeks.length - 1, Math.round(centerIdx + halfVisible));
    return { startIdx, endIdx };
  }, [viewport.center, viewport.weeksVisible, weeks, weekStartDay]);

  const visibleWeekCount = visibleRange.endIdx - visibleRange.startIdx + 1;
  const barWidth = Math.max(4, (chartWidth / visibleWeekCount) * 0.7);
  const barGap = chartWidth / visibleWeekCount;

  // Scale helpers
  const volumeScale = maxVolume > 0 ? chartHeight * 0.85 / maxVolume : 0;
  const elevationScale = maxElevation > 0 ? chartHeight * 0.85 / maxElevation : 0;

  const getBarX = useCallback((idx: number) => {
    return CHART_PADDING.left + (idx - visibleRange.startIdx) * barGap + (barGap - barWidth) / 2;
  }, [visibleRange.startIdx, barGap, barWidth]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setViewport(prev => {
      const delta = e.deltaY > 0 ? 2 : -2;
      const newVisible = Math.max(MIN_WEEKS_VISIBLE, Math.min(MAX_WEEKS_VISIBLE, prev.weeksVisible + delta));
      return { ...prev, weeksVisible: newVisible };
    });
  }, []);

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, center: viewport.center };
  }, [viewport.center]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const weeksPerPixel = viewport.weeksVisible / chartWidth;
    const weeksDelta = -dx * weeksPerPixel;
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const newCenter = new Date(dragStartRef.current.center.getTime() + weeksDelta * msPerWeek);
    setViewport(prev => ({ ...prev, center: newCenter }));
  }, [isDragging, viewport.weeksVisible, chartWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Click on week bar
  const handleBarClick = useCallback((weekStart: Date, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Extend viewport to include this week
      setViewport(prev => {
        const currentCenter = prev.center;
        const diff = Math.abs(differenceInCalendarWeeks(weekStart, currentCenter, { weekStartsOn: weekStartDay }));
        const newVisible = Math.max(prev.weeksVisible, diff * 2 + 4);
        return { ...prev, weeksVisible: Math.min(MAX_WEEKS_VISIBLE, newVisible) };
      });
    } else {
      setViewport(prev => ({ ...prev, center: weekStart }));
      onScrollToWeek(weekStart);
    }
  }, [onScrollToWeek, weekStartDay]);

  // Click on phase strip
  const handlePhaseClick = useCallback((startIdx: number, endIdx: number, e: React.MouseEvent) => {
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

  // Click on race marker
  const handleRaceClick = useCallback((weekIdx: number, e: React.MouseEvent) => {
    if (weekIdx >= 0 && weekIdx < weeks.length) {
      const raceDate = weeks[weekIdx].weekStart;
      if (e.ctrlKey || e.metaKey) {
        setViewport(prev => {
          const diff = Math.abs(differenceInCalendarWeeks(raceDate, prev.center, { weekStartsOn: weekStartDay }));
          return { ...prev, weeksVisible: Math.min(MAX_WEEKS_VISIBLE, Math.max(prev.weeksVisible, diff * 2 + 4)) };
        });
      } else {
        setViewport(prev => ({ ...prev, center: raceDate }));
      }
      onScrollToWeek(raceDate);
    }
  }, [weeks, onScrollToWeek, weekStartDay]);

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

  // Find today's position
  const todayIdx = useMemo(() => {
    const now = new Date();
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

  // X-axis label density
  const labelInterval = useMemo(() => {
    if (visibleWeekCount <= 8) return 1;
    if (visibleWeekCount <= 16) return 2;
    if (visibleWeekCount <= 32) return 4;
    return 8;
  }, [visibleWeekCount]);

  // Compute week progress text
  const weekProgress = useMemo(() => {
    if (!weeks.length) return '';
    const total = weeks.length;
    const currentIdx = todayIdx >= 0 ? todayIdx + 1 : '?';
    return `Week ${currentIdx} of ${total}`;
  }, [weeks.length, todayIdx]);

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
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); handleBarLeave(); }}
        >
          <svg
            width={containerWidth}
            height={EXPANDED_HEIGHT}
            style={{ display: 'block' }}
          >
            {/* Phase strip at top */}
            {phaseSegments.map(seg => {
              const x1 = getBarX(Math.max(seg.startWeekIdx, visibleRange.startIdx));
              const x2 = getBarX(Math.min(seg.endWeekIdx, visibleRange.endIdx)) + barWidth;
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
            {timelineWeeks.map((tw, i) => {
              if (i < visibleRange.startIdx || i > visibleRange.endIdx) return null;
              const x = getBarX(i);
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
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleBarClick(tw.weekStart, e); }}
                  onMouseMove={(e) => handleBarHover(e, i)}
                  onMouseLeave={handleBarLeave}
                />
              );
            })}

            {/* Elevation line (past only in v1) */}
            {maxElevation > 0 && (() => {
              const points: string[] = [];
              for (let i = visibleRange.startIdx; i <= visibleRange.endIdx; i++) {
                const tw = timelineWeeks[i];
                if (!tw || (!tw.isPast && !tw.isCurrentWeek)) continue;
                if (tw.actualElevationFt === 0) continue;
                const x = getBarX(i) + barWidth / 2;
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
            {todayIdx >= visibleRange.startIdx && todayIdx <= visibleRange.endIdx && (
              <>
                <line
                  x1={getBarX(todayIdx) + barWidth / 2}
                  y1={CHART_PADDING.top + PHASE_STRIP_HEIGHT - 4}
                  x2={getBarX(todayIdx) + barWidth / 2}
                  y2={CHART_PADDING.top + PHASE_STRIP_HEIGHT + chartHeight + 4}
                  stroke={TODAY_LINE_COLOR}
                  strokeWidth={2}
                  opacity={0.6}
                />
                <text
                  x={getBarX(todayIdx) + barWidth / 2}
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
              if (race.weekIdx < visibleRange.startIdx || race.weekIdx > visibleRange.endIdx) return null;
              const x = getBarX(race.weekIdx) + barWidth / 2;
              return (
                <g
                  key={race.phase.id}
                  style={{ cursor: 'pointer' }}
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
            {timelineWeeks.map((tw, i) => {
              if (i < visibleRange.startIdx || i > visibleRange.endIdx) return null;
              if ((i - visibleRange.startIdx) % labelInterval !== 0) return null;
              const x = getBarX(i) + barWidth / 2;
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
