// Workout API - Pure functions for workout CRUD operations

import type { FetchFn } from './client';
import type { Workout, WorkoutCreate, WorkoutUpdate } from '../types/workout';

export async function getWorkouts(
  fetch: FetchFn,
  params?: { start_date?: string; end_date?: string }
): Promise<Workout[]> {
  const query = new URLSearchParams();
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  const qs = query.toString();

  const res = await fetch(`/workouts${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Failed to fetch workouts: ${res.status}`);
  return res.json();
}

export async function getWorkout(fetch: FetchFn, id: string): Promise<Workout> {
  const res = await fetch(`/workouts/${id}`);
  if (!res.ok) throw new Error(`Workout not found: ${res.status}`);
  return res.json();
}

export async function createWorkout(
  fetch: FetchFn,
  data: WorkoutCreate
): Promise<Workout> {
  const res = await fetch('/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create workout: ${res.status}`);
  return res.json();
}

export async function updateWorkout(
  fetch: FetchFn,
  id: string,
  data: WorkoutUpdate
): Promise<Workout> {
  const res = await fetch(`/workouts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update workout: ${res.status}`);
  return res.json();
}

export async function deleteWorkout(fetch: FetchFn, id: string): Promise<void> {
  const res = await fetch(`/workouts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete workout: ${res.status}`);
}

export async function getLinkedActivity(fetch: FetchFn, workoutId: string) {
  const res = await fetch(`/workouts/${workoutId}/activity`);
  if (!res.ok) return null;
  return res.json();
}

export async function syncGCal(fetch: FetchFn): Promise<void> {
  const res = await fetch('/workouts/sync-gcal', { method: 'POST' });
  if (!res.ok) throw new Error(`GCal sync failed: ${res.status}`);
}
