import type { FetchFn } from './client';
import type { DashboardData } from '../types/dashboard';

export async function getDashboard(fetch: FetchFn): Promise<DashboardData> {
  const res = await fetch('/dashboard');
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  return res.json();
}
