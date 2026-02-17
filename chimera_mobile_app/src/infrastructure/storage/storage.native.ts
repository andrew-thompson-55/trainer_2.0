// Storage adapter for native (uses AsyncStorage)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from './storage';

export const storageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

// Define CACHE_KEYS directly to avoid circular dependency
export const CACHE_KEYS = {
  WORKOUTS: 'chimera_cache_workouts',
  DAILY_LOGS: 'chimera_cache_daily_logs',
  DASHBOARD: 'chimera_cache_dashboard',
} as const;
