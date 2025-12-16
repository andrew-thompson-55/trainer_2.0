import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Render URL
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://trainer-2-0.onrender.com/v1';

const CACHE_KEYS = {
  WORKOUTS: 'chimera_cache_workouts',
};

export const api = {
  // --- WORKOUTS ---

  // 1. Get from Cache (Instant)
  async getCachedWorkouts() {
    try {
      const jsonValue = await AsyncStorage.getItem(CACHE_KEYS.WORKOUTS);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch(e) {
      return [];
    }
  },

  // 2. Get from Network (Updates Cache)
  async getWorkouts() {
    try {
      const response = await fetch(`${API_BASE}/workouts`);
      
      // Check for server errors (non-200 range)
      if (!response.ok) {
        console.error("Server Error:", response.status, await response.text());
        // Return empty array on error so UI doesn't crash
        return []; 
      }

      const data = await response.json();

      // Validate data shape
      if (Array.isArray(data)) {
        await AsyncStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(data));
        return data;
      }
      return [];
    } catch (error) {
      console.error("Network Error:", error);
      return [];
    }
  },

  async createWorkout(workoutData: any) {
    const response = await fetch(`${API_BASE}/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workoutData),
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return await response.json();
  },

  async updateWorkout(id: string, updates: any) {
    const response = await fetch(`${API_BASE}/workouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return await response.json();
  },

  // --- DAILY LOGS ---

  async getDailyLog(date: string) {
    try {
        const response = await fetch(`${API_BASE}/daily-logs/${date}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
  },

  async updateDailyLog(date: string, data: any) {
    const response = await fetch(`${API_BASE}/daily-logs/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to save log");
    return await response.json();
  },

  // get completed linked activity data
  async getLinkedActivity(plannedWorkoutId: string) {
    try {
        const response = await fetch(`${API_BASE}/workouts/${plannedWorkoutId}/activity`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
  },
};