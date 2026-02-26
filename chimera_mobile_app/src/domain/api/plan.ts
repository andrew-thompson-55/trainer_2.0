import type { FetchFn } from './client';
import type { CalendarData, TrainingPhase, PlanTemplate, AgentAction } from '../types/plan';

export async function getCalendarData(
  fetch: FetchFn,
  startDate: string,
  weeks: number = 5
): Promise<CalendarData> {
  const res = await fetch(`/plan/calendar?start_date=${startDate}&weeks=${weeks}`);
  if (!res.ok) throw new Error(`Failed to fetch calendar data: ${res.status}`);
  return res.json();
}

export async function moveWorkout(
  fetch: FetchFn,
  workoutId: string,
  newDate: string
): Promise<any> {
  const res = await fetch(`/plan/workouts/${workoutId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_date: newDate }),
  });
  if (!res.ok) throw new Error(`Failed to move workout: ${res.status}`);
  return res.json();
}

export async function duplicateWorkout(
  fetch: FetchFn,
  workoutId: string,
  targetDate: string
): Promise<any> {
  const res = await fetch(`/plan/workouts/${workoutId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_date: targetDate }),
  });
  if (!res.ok) throw new Error(`Failed to duplicate workout: ${res.status}`);
  return res.json();
}

export async function deleteWorkout(
  fetch: FetchFn,
  workoutId: string
): Promise<any> {
  const res = await fetch(`/plan/workouts/${workoutId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete workout: ${res.status}`);
  return res.json();
}

export async function moveWeek(
  fetch: FetchFn,
  sourceWeekStart: string,
  targetWeekStart: string
): Promise<any> {
  const res = await fetch('/plan/weeks/move', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_week_start: sourceWeekStart, target_week_start: targetWeekStart }),
  });
  if (!res.ok) throw new Error(`Failed to move week: ${res.status}`);
  return res.json();
}

export async function duplicateWeek(
  fetch: FetchFn,
  sourceWeekStart: string,
  targetWeekStart: string
): Promise<any> {
  const res = await fetch('/plan/weeks/duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_week_start: sourceWeekStart, target_week_start: targetWeekStart }),
  });
  if (!res.ok) throw new Error(`Failed to duplicate week: ${res.status}`);
  return res.json();
}

export async function clearWeek(
  fetch: FetchFn,
  weekStart: string
): Promise<any> {
  const res = await fetch(`/plan/weeks/${weekStart}/clear`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to clear week: ${res.status}`);
  return res.json();
}

export async function saveWeekAsTemplate(
  fetch: FetchFn,
  weekStart: string,
  title: string
): Promise<PlanTemplate> {
  const res = await fetch('/plan/weeks/save-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_start: weekStart, title }),
  });
  if (!res.ok) throw new Error(`Failed to save template: ${res.status}`);
  return res.json();
}

export async function getPhases(fetch: FetchFn): Promise<TrainingPhase[]> {
  const res = await fetch('/plan/phases');
  if (!res.ok) throw new Error(`Failed to fetch phases: ${res.status}`);
  return res.json();
}

export async function createPhase(
  fetch: FetchFn,
  data: Partial<TrainingPhase>
): Promise<TrainingPhase> {
  const res = await fetch('/plan/phases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create phase: ${res.status}`);
  return res.json();
}

export async function updatePhase(
  fetch: FetchFn,
  phaseId: string,
  data: Partial<TrainingPhase>
): Promise<TrainingPhase> {
  const res = await fetch(`/plan/phases/${phaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update phase: ${res.status}`);
  return res.json();
}

export async function deletePhase(
  fetch: FetchFn,
  phaseId: string
): Promise<void> {
  const res = await fetch(`/plan/phases/${phaseId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete phase: ${res.status}`);
}

export async function getTemplates(
  fetch: FetchFn,
  type?: string
): Promise<PlanTemplate[]> {
  const url = type ? `/plan/templates?type=${type}` : '/plan/templates';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
  return res.json();
}

export async function createTemplate(
  fetch: FetchFn,
  data: Partial<PlanTemplate>
): Promise<PlanTemplate> {
  const res = await fetch('/plan/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create template: ${res.status}`);
  return res.json();
}

export async function deleteTemplate(
  fetch: FetchFn,
  templateId: string
): Promise<void> {
  const res = await fetch(`/plan/templates/${templateId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete template: ${res.status}`);
}

export async function applyTemplate(
  fetch: FetchFn,
  templateId: string,
  startDate: string,
  detailLevel: 'full' | 'structure' = 'full'
): Promise<any> {
  const res = await fetch(`/plan/templates/${templateId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate, detail_level: detailLevel }),
  });
  if (!res.ok) throw new Error(`Failed to apply template: ${res.status}`);
  return res.json();
}

export async function getAgentActions(
  fetch: FetchFn,
  limit: number = 20
): Promise<AgentAction[]> {
  const res = await fetch(`/plan/agent-actions?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch agent actions: ${res.status}`);
  return res.json();
}

export async function revertAgentAction(
  fetch: FetchFn,
  actionId: string
): Promise<any> {
  const res = await fetch(`/plan/agent-actions/${actionId}/revert`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to revert action: ${res.status}`);
  return res.json();
}
