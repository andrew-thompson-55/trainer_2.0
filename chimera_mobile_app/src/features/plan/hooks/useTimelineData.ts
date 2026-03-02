// useTimelineData - Aggregates activities into weekly buckets for the training timeline chart

import { useMemo } from 'react';
import { parseISO, startOfWeek, isBefore, isSameWeek } from 'date-fns';
import type { CalendarActivity, TrainingPhase, TimelineWeekData } from '@domain/types/plan';
import type { WeekData } from './useTrainingPlan';

const METERS_TO_MILES = 0.000621371;
const METERS_TO_KM = 0.001;
const METERS_TO_FEET = 3.28084;

export interface PhaseSegment {
  phase: TrainingPhase;
  startWeekIdx: number;
  endWeekIdx: number;
  color: string;
}

export interface RaceMarker {
  phase: TrainingPhase;
  weekIdx: number;
}

interface UseTimelineDataReturn {
  timelineWeeks: TimelineWeekData[];
  phaseSegments: PhaseSegment[];
  races: RaceMarker[];
  maxVolume: number;
  maxElevation: number;
}

const PHASE_COLORS: Record<string, string> = {
  base: '#3b82f6',
  build: '#f59e0b',
  peak: '#ef4444',
  taper: '#22c55e',
  recovery: '#8b5cf6',
  race: '#f97316',
  custom: '#64748b',
};

export function useTimelineData(
  weeks: WeekData[],
  phases: TrainingPhase[],
  activities: CalendarActivity[],
  distanceUnit: 'mi' | 'km',
  weekStartDay: 0 | 1,
): UseTimelineDataReturn {
  return useMemo(() => {
    if (!weeks.length) {
      return { timelineWeeks: [], phaseSegments: [], races: [], maxVolume: 0, maxElevation: 0 };
    }

    const now = new Date();
    const distanceFactor = distanceUnit === 'mi' ? METERS_TO_MILES : METERS_TO_KM;

    // Build a map from week key to index for quick lookup
    const weekKeyToIdx = new Map<string, number>();
    weeks.forEach((w, i) => weekKeyToIdx.set(w.weekKey, i));

    // Bucket activities by week
    const volumeByWeek = new Map<number, number>();
    const elevationByWeek = new Map<number, number>();

    for (const activity of activities) {
      const actDate = parseISO(activity.start_time);
      const actWeekStart = startOfWeek(actDate, { weekStartsOn: weekStartDay });
      const key = actWeekStart.toISOString().slice(0, 10);
      // Find closest matching week key (format might differ slightly)
      let idx = weekKeyToIdx.get(key);
      if (idx === undefined) {
        // Fallback: find which week this activity belongs to
        for (let i = 0; i < weeks.length; i++) {
          if (isSameWeek(actDate, weeks[i].weekStart, { weekStartsOn: weekStartDay })) {
            idx = i;
            break;
          }
        }
      }
      if (idx === undefined) continue;

      const dist = activity.distance_meters ?? 0;
      const elev = activity.total_elevation_gain ?? 0;
      volumeByWeek.set(idx, (volumeByWeek.get(idx) ?? 0) + dist);
      elevationByWeek.set(idx, (elevationByWeek.get(idx) ?? 0) + elev);
    }

    // Build timeline weeks
    const timelineWeeks: TimelineWeekData[] = weeks.map((w, i) => {
      const rawVolume = volumeByWeek.get(i) ?? 0;
      const rawElevation = elevationByWeek.get(i) ?? 0;
      return {
        weekStart: w.weekStart,
        actualVolumeMi: rawVolume * distanceFactor,
        actualElevationFt: rawElevation * METERS_TO_FEET,
        isPast: isBefore(w.weekStart, startOfWeek(now, { weekStartsOn: weekStartDay })),
        isCurrentWeek: w.isCurrentWeek,
      };
    });

    // Compute maxes
    let maxVolume = 0;
    let maxElevation = 0;
    for (const tw of timelineWeeks) {
      if (tw.actualVolumeMi > maxVolume) maxVolume = tw.actualVolumeMi;
      if (tw.actualElevationFt > maxElevation) maxElevation = tw.actualElevationFt;
    }

    // Build phase segments
    const phaseSegments: PhaseSegment[] = [];
    const races: RaceMarker[] = [];

    for (const phase of phases) {
      const phaseStart = parseISO(phase.start_date);
      const phaseEnd = parseISO(phase.end_date);
      let startIdx = -1;
      let endIdx = -1;

      for (let i = 0; i < weeks.length; i++) {
        const wStart = weeks[i].weekStart;
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);

        if (phaseStart <= wEnd && phaseEnd >= wStart) {
          if (startIdx === -1) startIdx = i;
          endIdx = i;
        }
      }

      if (startIdx >= 0) {
        const color = phase.color || PHASE_COLORS[phase.phase_type] || PHASE_COLORS.custom;
        phaseSegments.push({ phase, startWeekIdx: startIdx, endWeekIdx: endIdx, color });

        if (phase.phase_type === 'race') {
          races.push({ phase, weekIdx: endIdx });
        }
      }
    }

    return { timelineWeeks, phaseSegments, races, maxVolume, maxElevation };
  }, [weeks, phases, activities, distanceUnit, weekStartDay]);
}
