// User API - Pure functions for user profile operations

import type { FetchFn } from './client';
import type { User, ProfileUpdate } from '../types/user';

export async function getProfile(fetch: FetchFn): Promise<User> {
  const res = await fetch('/users/profile');
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  return res.json();
}

export async function updateProfile(
  fetch: FetchFn,
  data: ProfileUpdate
): Promise<User> {
  const res = await fetch('/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
  return res.json();
}

export async function deleteAccount(fetch: FetchFn): Promise<void> {
  const res = await fetch('/users/account', { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete account: ${res.status}`);
}
