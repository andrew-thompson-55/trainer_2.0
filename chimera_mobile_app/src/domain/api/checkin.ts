import type { CheckinStatus, MorningCheckinCreate, WorkoutUpdateCreate } from '../types/checkin';

type FetchFn = (url: string, options?: RequestInit) => Promise<Response>;

export async function getCheckinStatus(fetch: FetchFn, date: string): Promise<CheckinStatus> {
  const res = await fetch(`/checkin/${date}/status`);
  if (!res.ok) throw new Error(`Failed to get checkin status: ${res.status}`);
  return res.json();
}

export async function saveMorningCheckin(fetch: FetchFn, date: string, data: MorningCheckinCreate): Promise<any> {
  const res = await fetch(`/checkin/${date}/morning`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save morning checkin: ${res.status}`);
  return res.json();
}

export async function saveWorkoutUpdate(fetch: FetchFn, stravaActivityId: string, data: WorkoutUpdateCreate): Promise<any> {
  const res = await fetch(`/checkin/workout/${stravaActivityId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save workout update: ${res.status}`);
  return res.json();
}

export async function getStreak(fetch: FetchFn): Promise<number> {
  const res = await fetch('/checkin/streak');
  if (!res.ok) throw new Error(`Failed to get streak: ${res.status}`);
  const data = await res.json();
  return data.streak;
}
