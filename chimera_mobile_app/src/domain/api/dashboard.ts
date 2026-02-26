import type { FetchFn } from './client';
import type { DashboardData } from '../types/dashboard';

export async function getDashboard(fetch: FetchFn): Promise<DashboardData> {
  const res = await fetch('/dashboard');
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  return res.json();
}

export async function toggleActivityStats(
  fetch: FetchFn,
  activityId: string,
  include: boolean
): Promise<void> {
  const res = await fetch(`/activities/${activityId}/stats`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ include }),
  });
  if (!res.ok) throw new Error(`Failed to toggle activity stats: ${res.status}`);
}
