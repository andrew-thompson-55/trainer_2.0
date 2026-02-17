// Daily Log API - Pure functions for daily log operations

import type { FetchFn } from './client';
import type { DailyLog } from '../types/daily-log';

export async function getDailyLog(
  fetch: FetchFn,
  date: string
): Promise<DailyLog | null> {
  const res = await fetch(`/daily-logs/${date}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateDailyLog(
  fetch: FetchFn,
  date: string,
  data: DailyLog
): Promise<DailyLog> {
  const res = await fetch(`/daily-logs/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update daily log: ${res.status}`);
  return res.json();
}
