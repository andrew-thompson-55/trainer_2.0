// Strava API - Pure functions for Strava integration

import type { FetchFn } from './client';

export async function connectStrava(fetch: FetchFn, code: string): Promise<void> {
  const res = await fetch('/strava/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Strava connection failed: ${res.status}`);
}

export async function getStravaStatus(fetch: FetchFn): Promise<{ connected: boolean }> {
  const res = await fetch('/strava/status');
  if (!res.ok) return { connected: false };
  return res.json();
}
