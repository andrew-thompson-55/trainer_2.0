// useTrainingPlan - Web-specific hook for the unified training plan page
// Uses GET /v1/plan/calendar as single data source with optimistic updates

import { useState, useCallback, useEffect, useRef } from 'react';
import { format, startOfWeek, addWeeks, addDays, parseISO } from 'date-fns';
import { authFetch } from '@infra/fetch/auth-fetch';
import * as planApi from '@domain/api/plan';
import type { Workout } from '@domain/types';
import type { TrainingPhase, PlanTemplate, AgentAction, CalendarData } from '@domain/types/plan';

export interface WeekData {
  weekStart: Date;
  weekKey: string; // YYYY-MM-DD
  days: DayData[];
}

export interface DayData {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  workouts: Workout[];
  isToday: boolean;
}

interface UseTrainingPlanReturn {
  weeks: WeekData[];
  phases: TrainingPhase[];
  templates: PlanTemplate[];
  agentActions: AgentAction[];
  currentStartDate: Date;
  loading: boolean;
  error: string | null;
  navigateWeeks: (offset: number) => void;
  navigateToDate: (date: Date) => void;
  goToToday: () => void;
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
  refreshData: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshAgentActions: () => Promise<void>;
}

function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function buildWeeks(
  startDate: Date,
  numWeeks: number,
  workouts: Workout[],
  today: string
): WeekData[] {
  const workoutsByDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    if (!w.start_time) continue;
    const dateKey = format(parseISO(w.start_time), 'yyyy-MM-dd');
    if (!workoutsByDate.has(dateKey)) workoutsByDate.set(dateKey, []);
    workoutsByDate.get(dateKey)!.push(w);
  }

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
    });
  }
  return weeks;
}

const NUM_WEEKS = 5;

export function useTrainingPlan(): UseTrainingPlanReturn {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [currentStartDate, setCurrentStartDate] = useState(() => getMonday(new Date()));
  const [rawWorkouts, setRawWorkouts] = useState<Workout[]>([]);
  const [phases, setPhases] = useState<TrainingPhase[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);

  const fetchCalendarData = useCallback(async (start: Date) => {
    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);
    try {
      const startStr = format(start, 'yyyy-MM-dd');
      const data = await planApi.getCalendarData(authFetch, startStr, NUM_WEEKS);
      if (id !== fetchRef.current) return; // stale
      setRawWorkouts(data.workouts || []);
      setPhases(data.phases || []);
    } catch (e: any) {
      if (id !== fetchRef.current) return;
      setError(e.message || 'Failed to load calendar');
    } finally {
      if (id === fetchRef.current) setLoading(false);
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

  // Initial load
  useEffect(() => {
    fetchCalendarData(currentStartDate);
    refreshTemplates();
    refreshAgentActions();
  }, [currentStartDate, fetchCalendarData, refreshTemplates, refreshAgentActions]);

  const refreshData = useCallback(async () => {
    await fetchCalendarData(currentStartDate);
  }, [currentStartDate, fetchCalendarData]);

  const navigateWeeks = useCallback((offset: number) => {
    setCurrentStartDate(prev => addWeeks(prev, offset));
  }, []);

  const navigateToDate = useCallback((date: Date) => {
    setCurrentStartDate(getMonday(date));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentStartDate(getMonday(new Date()));
  }, []);

  // Build weeks from raw data
  const weeks = buildWeeks(currentStartDate, NUM_WEEKS, rawWorkouts, todayStr);

  // --- Mutation helpers (optimistic + background sync) ---

  const moveWorkout = useCallback(async (workoutId: string, newDate: string) => {
    // Optimistic: move in local state
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
      await refreshData(); // rollback via refetch
      throw e;
    }
  }, [refreshData]);

  const duplicateWorkout = useCallback(async (workoutId: string, targetDate: string) => {
    try {
      await planApi.duplicateWorkout(authFetch, workoutId, targetDate);
      await refreshData();
    } catch (e: any) {
      throw e;
    }
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

  const moveWeek = useCallback(async (sourceStart: string, targetStart: string) => {
    try {
      await planApi.moveWeek(authFetch, sourceStart, targetStart);
      await refreshData();
    } catch (e: any) { throw e; }
  }, [refreshData]);

  const duplicateWeek = useCallback(async (sourceStart: string, targetStart: string) => {
    try {
      await planApi.duplicateWeek(authFetch, sourceStart, targetStart);
      await refreshData();
    } catch (e: any) { throw e; }
  }, [refreshData]);

  const clearWeek = useCallback(async (weekStart: string) => {
    try {
      await planApi.clearWeek(authFetch, weekStart);
      await refreshData();
    } catch (e: any) { throw e; }
  }, [refreshData]);

  const saveWeekAsTemplate = useCallback(async (weekStart: string, title: string) => {
    try {
      await planApi.saveWeekAsTemplate(authFetch, weekStart, title);
      await refreshTemplates();
    } catch (e: any) { throw e; }
  }, [refreshTemplates]);

  const createPhase = useCallback(async (data: Partial<TrainingPhase>) => {
    try {
      await planApi.createPhase(authFetch, data);
      await refreshData();
    } catch (e: any) { throw e; }
  }, [refreshData]);

  const updatePhase = useCallback(async (phaseId: string, data: Partial<TrainingPhase>) => {
    try {
      await planApi.updatePhase(authFetch, phaseId, data);
      await refreshData();
    } catch (e: any) { throw e; }
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
    try {
      await planApi.applyTemplate(authFetch, templateId, startDate, detailLevel);
      await refreshData();
    } catch (e: any) { throw e; }
  }, [refreshData]);

  const revertAgentAction = useCallback(async (actionId: string) => {
    try {
      await planApi.revertAgentAction(authFetch, actionId);
      await Promise.all([refreshData(), refreshAgentActions()]);
    } catch (e: any) { throw e; }
  }, [refreshData, refreshAgentActions]);

  return {
    weeks,
    phases,
    templates,
    agentActions,
    currentStartDate,
    loading,
    error,
    navigateWeeks,
    navigateToDate,
    goToToday,
    moveWorkout,
    duplicateWorkout,
    deleteWorkout,
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
