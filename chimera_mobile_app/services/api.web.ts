import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineQueue } from '@infra/offline/queue';
import { authFetch } from '@infra/fetch/auth-fetch';
import { API_BASE } from '@infra/fetch/config';

const CACHE_KEYS = {
  WORKOUTS: 'chimera_cache_workouts',
  DAILY_LOGS: 'chimera_cache_daily_logs',
};

// Web-specific network check - assume always online and let fetch handle errors
const getNetworkState = async () => {
  return { isConnected: true };
};

export const api = {
  // ============================================================
  // 🏋️‍♀️ WORKOUTS
  // ============================================================

  // --- 1. GET WORKOUTS (Read Data) ---
  async getWorkouts() {
    const { isConnected } = await getNetworkState();

    // A. If Online: Fetch & Cache
    if (isConnected) {
      try {
        console.log("🌍 Online: Fetching fresh data...");
        const response = await authFetch('/workouts');
        if (!response.ok) throw new Error("Server error");

        const data = await response.json();
        console.log("📦 Received workouts data:", data); // Debug log
        if (Array.isArray(data)) {
          await AsyncStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(data));
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
      const jsonValue = await AsyncStorage.getItem(CACHE_KEYS.WORKOUTS);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch(e) {
      return [];
    }
  },

  // --- 2. GET SINGLE WORKOUT (Read Data) ---
  async getWorkout(id: string) {
    const { isConnected } = await getNetworkState();

    // A. Try Online First
    if (isConnected) {
      try {
        const response = await authFetch(`/workouts/${id}`, {
            method: 'GET',
        });

        if (response.ok) {
            return await response.json();
        }
      } catch (e) {
        console.log(`⚠️ getWorkout API failed for ${id}, falling back to cache.`);
      }
    }

    // B. Offline Fallback: Search the cached list!
    const cachedList = await api.getCachedWorkouts();
    const found = cachedList.find((w: any) => w.id === id);

    return found || null;
  },

  // --- 2. UPDATE WORKOUT (Write Data) ---
  async updateWorkout(id: string, updates: any) {
    const { isConnected } = await getNetworkState();

    // A. Optimistic Update
    const cached = await api.getCachedWorkouts();
    const newCache = cached.map((w: any) => w.id === id ? { ...w, ...updates } : w);
    await AsyncStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(newCache));

    // B. Network Attempt
    if (isConnected) {
      try {
        const response = await authFetch(`/workouts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        if (response.ok) return await response.json();
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

  // --- 3. DELETE WORKOUT ---
  async deleteWorkout(id: string) {
    // A. Optimistic Delete
    const cached = await api.getCachedWorkouts();
    const newCache = cached.filter((w: any) => w.id !== id);
    await AsyncStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(newCache));

    // B. Network / Queue
    const { isConnected } = await getNetworkState();
    if (isConnected) {
        try {
            await authFetch(`/workouts/${id}`, { method: 'DELETE' });
            return;
        } catch (e) { /* Fallthrough */ }
    }

    await OfflineQueue.addToQueue({
        type: 'DELETE',
        endpoint: `/workouts/${id}`,
        payload: {}
    });
  },

  // --- 4. CREATE WORKOUT (Offline-Capable + Tracked) ---
  async createWorkout(workoutData: any) {
    const { isConnected } = await getNetworkState();

    if (isConnected) {
      try {
        const response = await authFetch('/workouts', {
          method: 'POST',
          body: JSON.stringify(workoutData),
        });

        if (response.ok) {
          const newWorkout = await response.json();
          const cached = await api.getCachedWorkouts();
          await AsyncStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify([...cached, newWorkout]));
          return newWorkout;
        }
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
    await AsyncStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify([...cached, optimisticWorkout]));

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
    const { isConnected } = await getNetworkState();
    let logsCache = {};

    // 1. Load from Cache first
    try {
        const json = await AsyncStorage.getItem(CACHE_KEYS.DAILY_LOGS);
        if (json) logsCache = JSON.parse(json);
    } catch (e) {}

    // 2. If Online, Fetch & Update Cache
    if (isConnected) {
        try {
            const response = await authFetch(`/daily-logs/${date}`);
            if (response.ok) {
                const data = await response.json();
                // Update just this day in the big object
                logsCache = { ...logsCache, [date]: data };
                await AsyncStorage.setItem(CACHE_KEYS.DAILY_LOGS, JSON.stringify(logsCache));
                return data;
            }
        } catch (e) { console.log("Log fetch failed, using cache"); }
    }

    // 3. Return Cached Data (or null if we never saw it)
    // @ts-ignore
    return logsCache[date] || null;
  },

  async updateDailyLog(date: string, data: any) {
    const { isConnected } = await getNetworkState();

    // 1. Optimistic Update (Save to Cache immediately)
    try {
        const json = await AsyncStorage.getItem(CACHE_KEYS.DAILY_LOGS);
        const logsCache = json ? JSON.parse(json) : {};
        const newCache = { ...logsCache, [date]: data };
        await AsyncStorage.setItem(CACHE_KEYS.DAILY_LOGS, JSON.stringify(newCache));
    } catch (e) {}

    // 2. Network Attempt
    if (isConnected) {
        try {
            const response = await authFetch(`/daily-logs/${date}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            if (response.ok) return await response.json();
        } catch (e) { console.log("Log update failed, queuing..."); }
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
                await AsyncStorage.setItem('offline_mutation_queue', JSON.stringify(queue));
            }

            // ❌ ZOMBIE SCENARIO (404/422)
            else if (res.status === 404 || res.status === 422) {
                 console.log(`⚠️ Item ${item.endpoint} invalid (Status ${res.status}). Removing.`);
                 queue.splice(i, 1);
                 i--;
                 await AsyncStorage.setItem('offline_mutation_queue', JSON.stringify(queue));
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
     const response = await authFetch('/workouts/sync-gcal', { method: 'POST' });
     if (!response.ok) throw new Error("Sync failed");
     return await response.json();
  },

  async getLinkedActivity(plannedWorkoutId: string) {
    try {
        const response = await authFetch(`/workouts/${plannedWorkoutId}/activity`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) { return null; }
  },
};
