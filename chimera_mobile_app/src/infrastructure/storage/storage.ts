// Storage adapter interface - Platform-agnostic

import { STORAGE_KEYS } from './keys';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Centralized cache keys
export const CACHE_KEYS = {
  WORKOUTS: STORAGE_KEYS.CACHE_WORKOUTS,
  DASHBOARD: STORAGE_KEYS.CACHE_DASHBOARD,
} as const;
