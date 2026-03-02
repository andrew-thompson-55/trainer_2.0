// useTrainingPlan - Web-specific hook for the unified training plan page
// Supports configurable week start day and infinite scroll loading

import { useState, useCallback, useEffect, useRef } from 'react';
import { format, startOfWeek, addWeeks, addDays, parseISO, isSameWeek } from 'date-fns';
import { authFetch } from '@infra/fetch/auth-fetch';
import * as planApi from '@domain/api/plan';
import type { Workout } from '@domain/types';
import type { TrainingPhase, PlanTemplate, AgentAction, CalendarData, CalendarActivity } from '@domain/types/plan';

export interface WeekData {
  weekStart: Date;
  weekKey: string; // YYYY-MM-DD
  days: DayData[];
  isCurrentWeek: boolean;
}

export interface DayData {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  workouts: Workout[];
  isToday: boolean;
}

interface UseTrainingPlanOptions {
  weekStartDay?: 0 | 1; // 0 = Sunday, 1 = Monday (default)
}

interface UseTrainingPlanReturn {
  weeks: WeekData[];
  phases: TrainingPhase[];
  templates: PlanTemplate[];
  agentActions: AgentAction[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  weekStartDay: 0 | 1;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  currentWeekRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;
  goToToday: () => void;
  jumpToDate: (date: Date) => void;
  moveWorkout: (workoutId: string, newDate: string) => Promise<void>;
  duplicateWorkout: (workoutId: string, targetDate: string) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  moveWeek: (sourceStart: string, targetStart: string) => Promise<void>;
  duplicateWeek: (sourceStart: string, targetStart: string) => Promise<void>;
  clearWeek: (weekStart: string) => Promise<void>;
  saveWeekAsTemplate: (weekStart: string, title: string) => Promise<void>;
  createPhase: (data: Partial<TrainingPhase>) => Promise<void>;
  updatePhase: (phaseId: string, data: Partial<TrainingPhase>) => Promise<void>;
  deletePhase: (phaseId: string) => Promise<void>;
  applyTemplate: (templateId: string, startDate: string, detailLevel: 'full' | 'structure') => Promise<void>;
  revertAgentAction: (actionId: string) => Promise<void>;
  activities: CalendarActivity[];
  refreshData: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshAgentActions: () => Promise<void>;
  updateWorkout: (workoutId: string, data: Partial<Workout>) => Promise<void>;
}

function getWeekStart(date: Date, weekStartsOn: 0 | 1): Date {
  return startOfWeek(date, { weekStartsOn });
}

function buildWeeks(
  startDate: Date,
  numWeeks: number,
  workouts: Workout[],
  today: string,
  weekStartsOn: 0 | 1
): WeekData[] {
  const workoutsByDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    if (!w.start_time) continue;
    const dateKey = format(parseISO(w.start_time), 'yyyy-MM-dd');
    if (!workoutsByDate.has(dateKey)) workoutsByDate.set(dateKey, []);
    workoutsByDate.get(dateKey)!.push(w);
  }

  const todayDate = new Date();
  const weeks: WeekData[] = [];
  for (let wi = 0; wi < numWeeks; wi++) {
    const weekStart = addWeeks(startDate, wi);
    const days: DayData[] = [];
    for (let di = 0; di < 7; di++) {
      const date = addDays(weekStart, di);
      const dateKey = format(date, 'yyyy-MM-dd');
      days.push({
        date,
        dateKey,
        workouts: workoutsByDate.get(dateKey) || [],
        isToday: dateKey === today,
      });
    }
    weeks.push({
      weekStart,
      weekKey: format(weekStart, 'yyyy-MM-dd'),
      days,
      isCurrentWeek: isSameWeek(weekStart, todayDate, { weekStartsOn }),
    });
  }
  return weeks;
}

const INITIAL_WEEKS = 12;
const LOAD_MORE_WEEKS = 8;
const MAX_PAST_WEEKS = 52;

export function useTrainingPlan(options?: UseTrainingPlanOptions): UseTrainingPlanReturn {
  const weekStartDay = options?.weekStartDay ?? 1;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // rangeStart / totalWeeks define the visible window.
  // They are managed by refs for scroll-triggered updates to avoid
  // re-triggering the initial-load effect and creating an infinite loop.
  const [rangeStart, setRangeStart] = useState(() => getWeekStart(new Date(), weekStartDay));
  const [totalWeeks, setTotalWeeks] = useState(INITIAL_WEEKS);
  const rangeStartRef = useRef(rangeStart);
  const totalWeeksRef = useRef(totalWeeks);

  // Keep refs in sync with state
  useEffect(() => { rangeStartRef.current = rangeStart; }, [rangeStart]);
  useEffect(() => { totalWeeksRef.current = totalWeeks; }, [totalWeeks]);

  const [rawWorkouts, setRawWorkouts] = useState<Workout[]>([]);
  const [rawActivities, setRawActivities] = useState<CalendarActivity[]>([]);
  const [phases, setPhases] = useState<TrainingPhase[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const pastWeeksLoaded = useRef(0);
  // Flag to suppress the top sentinel on initial load (scroll starts at top)
  const initialLoadDone = useRef(false);

  // Refs for scroll and sentinels
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Cache of fetched date ranges to avoid re-fetching
  const fetchedRangesRef = useRef<Set<string>>(new Set());

  const fetchCalendarRange = useCallback(async (start: Date, weeks: number, merge = false) => {
    const startStr = format(start, 'yyyy-MM-dd');
    const rangeKey = `${startStr}:${weeks}`;

    // Skip if already fetched this exact range
    if (merge && fetchedRangesRef.current.has(rangeKey)) return;

    const id = merge ? fetchRef.current : ++fetchRef.current;
    if (!merge) {
      setLoading(true);
      setError(null);
      fetchedRangesRef.current.clear();
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await planApi.getCalendarData(authFetch, startStr, weeks);
      if (!merge && id !== fetchRef.current) return; // stale

      fetchedRangesRef.current.add(rangeKey);

      if (merge) {
        setRawWorkouts(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newWorkouts = (data.workouts || []).filter((w: Workout) => !existingIds.has(w.id));
          return [...prev, ...newWorkouts];
        });
        setRawActivities(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newActivities = (data.activities || []).filter((a: CalendarActivity) => !existingIds.has(a.id));
          return [...prev, ...newActivities];
        });
        setPhases(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPhases = (data.phases || []).filter((p: TrainingPhase) => !existingIds.has(p.id));
          return [...prev, ...newPhases];
        });
      } else {
        setRawWorkouts(data.workouts || []);
        setRawActivities(data.activities || []);
        setPhases(data.phases || []);
      }
    } catch (e: any) {
      if (!merge && id !== fetchRef.current) return;
      if (!merge) setError(e.message || 'Failed to load calendar');
    } finally {
      if (merge) {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      } else {
        if (id === fetchRef.current) setLoading(false);
      }
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    try {
      const data = await planApi.getTemplates(authFetch);
      setTemplates(data);
    } catch (e: any) {
      console.error('Failed to load templates:', e);
    }
  }, []);

  const refreshAgentActions = useCallback(async () => {
    try {
      const data = await planApi.getAgentActions(authFetch, 20);
      setAgentActions(data);
    } catch (e: any) {
      console.error('Failed to load agent actions:', e);
    }
  }, []);

  // Initial load — runs once on mount, then scroll handles the rest
  useEffect(() => {
    fetchCalendarRange(rangeStart, totalWeeks).then(() => {
      initialLoadDone.current = true;
      // After initial data loads, scroll to today's week
      requestAnimationFrame(() => {
        currentWeekRef.current?.scrollIntoView({ block: 'center' });
      });
    });
    refreshTemplates();
    refreshAgentActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: observe sentinels
  // This effect uses refs for rangeStart/totalWeeks so it does NOT
  // re-run (and re-create the observer) when those values change.
  useEffect(() => {
    const topEl = topSentinelRef.current;
    const bottomEl = bottomSentinelRef.current;
    const scrollRoot = scrollContainerRef.current;
    if (!topEl || !bottomEl || !scrollRoot) return;

    const observer = new IntersectionObserver((entries) => {
      // Don't fire until the initial load has completed
      if (!initialLoadDone.current) return;

      for (const entry of entries) {
        if (!entry.isIntersecting || loadingMoreRef.current) continue;

        if (entry.target === bottomEl) {
          // Load more future weeks
          loadingMoreRef.current = true;
          const newEnd = addWeeks(rangeStartRef.current, totalWeeksRef.current);
          setTotalWeeks(prev => prev + LOAD_MORE_WEEKS);
          totalWeeksRef.current += LOAD_MORE_WEEKS;
          fetchCalendarRange(newEnd, LOAD_MORE_WEEKS, true);

        } else if (entry.target === topEl && pastWeeksLoaded.current < MAX_PAST_WEEKS) {
          // Prepend past weeks
          loadingMoreRef.current = true;
          const prevHeight = scrollRoot.scrollHeight;

          const newStart = addWeeks(rangeStartRef.current, -LOAD_MORE_WEEKS);
          pastWeeksLoaded.current += LOAD_MORE_WEEKS;

          // Update both state and ref immediately
          rangeStartRef.current = newStart;
          totalWeeksRef.current += LOAD_MORE_WEEKS;
          setRangeStart(newStart);
          setTotalWeeks(prev => prev + LOAD_MORE_WEEKS);

          fetchCalendarRange(newStart, LOAD_MORE_WEEKS, true).then(() => {
            // Restore scroll position after prepend
            requestAnimationFrame(() => {
              const newHeight = scrollRoot.scrollHeight;
              scrollRoot.scrollTop += (newHeight - prevHeight);
            });
          });
        }
      }
    }, {
      root: scrollRoot,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, [fetchCalendarRange]); // stable dep only

  const refreshData = useCallback(async () => {
    fetchedRangesRef.current.clear();
    await fetchCalendarRange(rangeStartRef.current, totalWeeksRef.current);
  }, [fetchCalendarRange]);

  const goToToday = useCallback(() => {
    requestAnimationFrame(() => {
      currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const jumpToDate = useCallback((date: Date) => {
    const newStart = addWeeks(getWeekStart(date, weekStartDay), -4); // center the target
    fetchedRangesRef.current.clear();
    pastWeeksLoaded.current = 0;
    initialLoadDone.current = false;
    rangeStartRef.current = newStart;
    totalWeeksRef.current = INITIAL_WEEKS;
    setRangeStart(newStart);
    setTotalWeeks(INITIAL_WEEKS);
    fetchCalendarRange(newStart, INITIAL_WEEKS).then(() => {
      initialLoadDone.current = true;
    });
  }, [weekStartDay, fetchCalendarRange]);

  // Build weeks from raw data
  const weeks = buildWeeks(rangeStart, totalWeeks, rawWorkouts, todayStr, weekStartDay);

  // --- Mutation helpers (optimistic + background sync) ---

  const moveWorkout = useCallback(async (workoutId: string, newDate: string) => {
    setRawWorkouts(prev => prev.map(w => {
      if (w.id !== workoutId) return w;
      const oldStart = parseISO(w.start_time);
      const [y, m, d] = newDate.split('-').map(Number);
      const newStart = new Date(oldStart);
      newStart.setFullYear(y, m - 1, d);
      const diff = newStart.getTime() - oldStart.getTime();
      const newEnd = new Date(parseISO(w.end_time).getTime() + diff);
      return { ...w, start_time: newStart.toISOString(), end_time: newEnd.toISOString() };
    }));
    try {
      await planApi.moveWorkout(authFetch, workoutId, newDate);
      await refreshData();
    } catch (e: any) {
      await refreshData();
      throw e;
    }
  }, [refreshData]);

  const duplicateWorkout = useCallback(async (workoutId: string, targetDate: string) => {
    await planApi.duplicateWorkout(authFetch, workoutId, targetDate);
    await refreshData();
  }, [refreshData]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    setRawWorkouts(prev => prev.filter(w => w.id !== workoutId));
    try {
      await planApi.deleteWorkout(authFetch, workoutId);
      await refreshData();
    } catch (e: any) {
      await refreshData();
      throw e;
    }
  }, [refreshData]);

  const updateWorkout = useCallback(async (workoutId: string, data: Partial<Workout>) => {
    setRawWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, ...data } : w));
    try {
      if (data.start_time) {
        const newDate = format(parseISO(data.start_time), 'yyyy-MM-dd');
        await planApi.moveWorkout(authFetch, workoutId, newDate);
      }
      await refreshData();
    } catch (e: any) {
      await refreshData();
      throw e;
    }
  }, [refreshData]);

  const moveWeek = useCallback(async (sourceStart: string, targetStart: string) => {
    await planApi.moveWeek(authFetch, sourceStart, targetStart);
    await refreshData();
  }, [refreshData]);

  const duplicateWeek = useCallback(async (sourceStart: string, targetStart: string) => {
    await planApi.duplicateWeek(authFetch, sourceStart, targetStart);
    await refreshData();
  }, [refreshData]);

  const clearWeek = useCallback(async (weekStart: string) => {
    await planApi.clearWeek(authFetch, weekStart);
    await refreshData();
  }, [refreshData]);

  const saveWeekAsTemplate = useCallback(async (weekStart: string, title: string) => {
    await planApi.saveWeekAsTemplate(authFetch, weekStart, title);
    await refreshTemplates();
  }, [refreshTemplates]);

  const createPhase = useCallback(async (data: Partial<TrainingPhase>) => {
    await planApi.createPhase(authFetch, data);
    await refreshData();
  }, [refreshData]);

  const updatePhase = useCallback(async (phaseId: string, data: Partial<TrainingPhase>) => {
    await planApi.updatePhase(authFetch, phaseId, data);
    await refreshData();
  }, [refreshData]);

  const deletePhase = useCallback(async (phaseId: string) => {
    setPhases(prev => prev.filter(p => p.id !== phaseId));
    try {
      await planApi.deletePhase(authFetch, phaseId);
      await refreshData();
    } catch (e: any) {
      await refreshData();
      throw e;
    }
  }, [refreshData]);

  const applyTemplate = useCallback(async (
    templateId: string, startDate: string, detailLevel: 'full' | 'structure'
  ) => {
    await planApi.applyTemplate(authFetch, templateId, startDate, detailLevel);
    await refreshData();
  }, [refreshData]);

  const revertAgentAction = useCallback(async (actionId: string) => {
    await planApi.revertAgentAction(authFetch, actionId);
    await Promise.all([refreshData(), refreshAgentActions()]);
  }, [refreshData, refreshAgentActions]);

  return {
    weeks,
    phases,
    activities: rawActivities,
    templates,
    agentActions,
    loading,
    loadingMore,
    error,
    weekStartDay,
    scrollContainerRef,
    currentWeekRef,
    topSentinelRef,
    bottomSentinelRef,
    goToToday,
    jumpToDate,
    moveWorkout,
    duplicateWorkout,
    deleteWorkout,
    updateWorkout,
    moveWeek,
    duplicateWeek,
    clearWeek,
    saveWeekAsTemplate,
    createPhase,
    updatePhase,
    deletePhase,
    applyTemplate,
    revertAgentAction,
    refreshData,
    refreshTemplates,
    refreshAgentActions,
  };
}
