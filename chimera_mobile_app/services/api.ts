// Unified API Client - Uses domain API + infrastructure adapters
// Replaces api.web.ts and api.native.ts with shared logic

import { authFetch } from '@infra/fetch/auth-fetch';
import { networkAdapter } from '@infra/network/network';
import { storageAdapter, CACHE_KEYS } from '@infra/storage/storage';
import { OfflineQueue } from '@infra/offline/queue';
import * as workoutsApi from '@domain/api/workouts';
import * as dailyLogsApi from '@domain/api/daily-logs';
import type { Workout, WorkoutCreate, WorkoutUpdate } from '@domain/types';

export const api = {
  // ============================================================
  // 🏋️‍♀️ WORKOUTS
  // ============================================================

  // --- 1. GET WORKOUTS (Read Data) ---
  async getWorkouts() {
    const { isConnected } = await networkAdapter.getNetworkState();

    // A. If Online: Fetch & Cache
    if (isConnected) {
      try {
        console.log("🌍 Online: Fetching fresh data...");
        const data = await workoutsApi.getWorkouts(authFetch);
        console.log("📦 Received workouts data:", data);
        if (Array.isArray(data)) {
          await storageAdapter.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(data));
          return data;
        }
      } catch (error) {
        console.log("⚠️ API Error, falling back to cache:", error);
      }
    }

    // B. If Offline or Error: Read Cache
    console.log("🔌 Offline Mode: Loading from local disk...");
    return api.getCachedWorkouts();
  },

  async getCachedWorkouts() {
    try {
      const jsonValue = await storageAdapter.getItem(CACHE_KEYS.WORKOUTS);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch(e) {
      return [];
    }
  },

  // --- 2. GET SINGLE WORKOUT (Read Data) ---
  async getWorkout(id: string) {
    const { isConnected } = await networkAdapter.getNetworkState();

    // A. Try Online First
    if (isConnected) {
      try {
        return await workoutsApi.getWorkout(authFetch, id);
      } catch (e) {
        console.log(`⚠️ getWorkout API failed for ${id}, falling back to cache.`);
      }
    }

    // B. Offline Fallback: Search the cached list
    const cachedList = await api.getCachedWorkouts();
    const found = cachedList.find((w: any) => w.id === id);
    return found || null;
  },

  // --- 3. UPDATE WORKOUT (Write Data) ---
  async updateWorkout(id: string, updates: WorkoutUpdate) {
    const { isConnected } = await networkAdapter.getNetworkState();

    // A. Optimistic Update
    const cached = await api.getCachedWorkouts();
    const newCache = cached.map((w: any) => w.id === id ? { ...w, ...updates } : w);
    await storageAdapter.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(newCache));

    // B. Network Attempt
    if (isConnected) {
      try {
        return await workoutsApi.updateWorkout(authFetch, id, updates);
      } catch (e) {
        console.log("⚠️ Update failed, queuing...");
      }
    }

    // C. Offline Fallback
    await OfflineQueue.addToQueue({
      type: 'UPDATE',
      endpoint: `/workouts/${id}`,
      payload: updates
    });
    return { ...updates, id, offline: true };
  },

  // --- 4. DELETE WORKOUT ---
  async deleteWorkout(id: string) {
    // A. Optimistic Delete
    const cached = await api.getCachedWorkouts();
    const newCache = cached.filter((w: any) => w.id !== id);
    await storageAdapter.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(newCache));

    // B. Network / Queue
    const { isConnected } = await networkAdapter.getNetworkState();
    if (isConnected) {
      try {
        await workoutsApi.deleteWorkout(authFetch, id);
        return;
      } catch (e) { /* Fallthrough */ }
    }

    await OfflineQueue.addToQueue({
      type: 'DELETE',
      endpoint: `/workouts/${id}`,
      payload: {}
    });
  },

  // --- 5. CREATE WORKOUT (Offline-Capable + Tracked) ---
  async createWorkout(workoutData: WorkoutCreate) {
    const { isConnected } = await networkAdapter.getNetworkState();

    if (isConnected) {
      try {
        const newWorkout = await workoutsApi.createWorkout(authFetch, workoutData);
        const cached = await api.getCachedWorkouts();
        await storageAdapter.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify([...cached, newWorkout]));
        return newWorkout;
      } catch (e) {
        console.log("Creation failed, switching to offline mode...");
      }
    }

    // 🔌 OFFLINE LOGIC
    console.log("🔌 Offline: Creating temporary workout...");

    const tempId = `temp-${Date.now()}`;
    const optimisticWorkout = {
      ...workoutData,
      id: tempId,
      status: 'planned'
    };

    // Save to Cache
    const cached = await api.getCachedWorkouts();
    await storageAdapter.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify([...cached, optimisticWorkout]));

    // Add to Outbox
    await OfflineQueue.addToQueue({
      type: 'CREATE',
      endpoint: '/workouts',
      payload: { ...workoutData, id: tempId }
    });

    return optimisticWorkout;
  },

  // ============================================================
  // 📊 DAILY LOGS (Offline Capable)
  // ============================================================

  async getDailyLog(date: string) {
    const { isConnected } = await networkAdapter.getNetworkState();
    let logsCache: Record<string, any> = {};

    // 1. Load from Cache first
    try {
      const json = await storageAdapter.getItem(CACHE_KEYS.DAILY_LOGS);
      if (json) logsCache = JSON.parse(json);
    } catch (e) {}

    // 2. If Online, Fetch & Update Cache
    if (isConnected) {
      try {
        const data = await dailyLogsApi.getDailyLog(authFetch, date);
        if (data) {
          // Update just this day in the big object
          logsCache = { ...logsCache, [date]: data };
          await storageAdapter.setItem(CACHE_KEYS.DAILY_LOGS, JSON.stringify(logsCache));
          return data;
        }
      } catch (e) {
        console.log("Log fetch failed, using cache");
      }
    }

    // 3. Return Cached Data (or null if we never saw it)
    return logsCache[date] || null;
  },

  async updateDailyLog(date: string, data: any) {
    const { isConnected } = await networkAdapter.getNetworkState();

    // 1. Optimistic Update (Save to Cache immediately)
    try {
      const json = await storageAdapter.getItem(CACHE_KEYS.DAILY_LOGS);
      const logsCache = json ? JSON.parse(json) : {};
      const newCache = { ...logsCache, [date]: data };
      await storageAdapter.setItem(CACHE_KEYS.DAILY_LOGS, JSON.stringify(newCache));
    } catch (e) {}

    // 2. Network Attempt
    if (isConnected) {
      try {
        return await dailyLogsApi.updateDailyLog(authFetch, date, data);
      } catch (e) {
        console.log("Log update failed, queuing...");
      }
    }

    // 3. Offline Fallback
    await OfflineQueue.addToQueue({
      type: 'UPDATE',
      endpoint: `/daily-logs/${date}`,
      payload: data
    });

    return data;
  },

  // ============================================================
  // 🔄 SYNC ENGINE (Smart Swap + Zombie Killer)
  // ============================================================

  async processOfflineQueue() {
    let queue = await OfflineQueue.getQueue();
    if (queue.length === 0) return 0;

    console.log(`🔄 Processing ${queue.length} offline actions...`);
    let processedCount = 0;

    // Use index loop to allow modifying future items
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];

      try {
        // Determine Method
        let method = 'POST';
        if (item.type === 'UPDATE') method = 'PATCH';
        if (item.type === 'DELETE') method = 'DELETE';

        // 🐛 Special Case: Daily Logs use PUT
        if (item.endpoint.includes('daily-logs')) {
          method = 'PUT';
        }

        // Prepare Body
        let bodyData = { ...item.payload };

        // 🧹 CLEANUP: If this is a CREATE, strip the temp ID before sending to server
        if (item.type === 'CREATE' && bodyData.id && bodyData.id.toString().startsWith('temp-')) {
          delete bodyData.id;
        }

        let options: any = {
          method: method,
        };

        if (bodyData && Object.keys(bodyData).length > 0) {
          options.body = JSON.stringify(bodyData);
        }

        // 🚀 FIRE REQUEST
        const res = await authFetch(item.endpoint, options);

        // ✅ SUCCESS SCENARIO
        if (res.ok) {
          // ID Swapping Logic (Only for Workouts)
          if (item.type === 'CREATE') {
            const serverData = await res.json();
            const realId = serverData.id;
            const tempId = item.payload.id;

            // 🕵️‍♂️ SEARCH & REPLACE IN FUTURE ITEMS
            for (let j = i + 1; j < queue.length; j++) {
              let futureItem = queue[j];
              let modified = false;

              if (futureItem.endpoint.includes(tempId)) {
                futureItem.endpoint = futureItem.endpoint.replace(tempId, realId);
                modified = true;
              }
              if (futureItem.payload && futureItem.payload.id === tempId) {
                futureItem.payload.id = realId;
                modified = true;
              }
              if (modified) console.log(`✨ ID Swap: ${tempId} ➡️ ${realId}`);
            }
          }

          processedCount++;
          queue.splice(i, 1);
          i--;
          await storageAdapter.setItem('offline_mutation_queue', JSON.stringify(queue));
        }

        // ❌ ZOMBIE SCENARIO (404/422)
        else if (res.status === 404 || res.status === 422) {
          console.log(`⚠️ Item ${item.endpoint} invalid (Status ${res.status}). Removing.`);
          queue.splice(i, 1);
          i--;
          await storageAdapter.setItem('offline_mutation_queue', JSON.stringify(queue));
        }
        // ⚠️ SERVER ERROR (500)
        else {
          console.log(`⚠️ Server error ${res.status}. Keeping item in queue.`);
        }

      } catch (e) {
        console.log(`⚠️ Network error. Stopping sync.`);
        break; // Stop processing if network drops
      }
    }

    return processedCount;
  },

  // --- OTHER ---

  async syncGCal() {
    return await workoutsApi.syncGCal(authFetch);
  },

  async getLinkedActivity(plannedWorkoutId: string) {
    return await workoutsApi.getLinkedActivity(authFetch, plannedWorkoutId);
  },
};
