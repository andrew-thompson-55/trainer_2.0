// Storage adapter for web (uses localStorage)

import type { StorageAdapter } from './storage';
import { STORAGE_KEYS } from './keys';

export const storageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};

// Define CACHE_KEYS directly to avoid circular dependency on web
export const CACHE_KEYS = {
  WORKOUTS: STORAGE_KEYS.CACHE_WORKOUTS,
  DASHBOARD: STORAGE_KEYS.CACHE_DASHBOARD,
} as const;
