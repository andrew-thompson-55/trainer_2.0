// Replace with your Render URL
const API_BASE = 'https://trainer-2-0.onrender.com/v1'; 

export const api = {
  async getWorkouts() {
    try {
      const response = await fetch(`${API_BASE}/workouts`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return [];
    }
  },

  async createWorkout(workoutData: any) {
    const response = await fetch(`${API_BASE}/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workoutData),
    });
    return await response.json();
  }
};