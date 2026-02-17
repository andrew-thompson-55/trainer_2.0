// Storage adapter for web (uses localStorage)

import type { StorageAdapter } from './storage';

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

// Re-export CACHE_KEYS from base module
export { CACHE_KEYS } from './storage';
