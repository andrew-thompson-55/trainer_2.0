// Storage adapter interface - Platform-agnostic

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Centralized cache keys
export const CACHE_KEYS = {
  WORKOUTS: 'chimera_cache_workouts',
  DASHBOARD: 'chimera_cache_dashboard',
} as const;
