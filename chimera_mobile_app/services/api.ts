// services/api.ts

// Replace with your Render URL
const API_BASE = 'https://trainer-2-0.onrender.com/v1'; 

export const api = {
  async getWorkouts() {
    try {
      const response = await fetch(`${API_BASE}/workouts`);
      
      // 1. Check if the server returned a success code (200-299)
      if (!response.ok) {
        console.error("Server Error:", response.status, await response.text());
        return []; // Return empty list on error so app doesn't crash
      }

      const data = await response.json();

      // 2. Safety Check: Is 'data' actually an Array?
      if (!Array.isArray(data)) {
        console.error("API returned non-array data:", data);
        return [];
      }

      return data;

    } catch (error) {
      console.error("Network Error:", error);
      return [];
    }
  },

  async createWorkout(workoutData: any) {
    try {
        const response = await fetch(`${API_BASE}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutData),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        return await response.json();
    } catch (e) {
        console.error("Create Workout Failed:", e);
        throw e;
    }
  },

  async updateWorkout(id: string, updates: any) {
    try {
      const response = await fetch(`${API_BASE}/workouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error("Update Workout Failed:", e);
      throw e;
    }
  },
  
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
  }
};