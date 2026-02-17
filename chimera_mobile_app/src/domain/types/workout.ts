// Workout types - Mirror backend schemas.py

export type ActivityType = 'run' | 'bike' | 'swim' | 'strength' | 'other';
export type WorkoutStatus = 'planned' | 'completed' | 'missed';

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;        // ISO 8601 datetime
  end_time: string;          // ISO 8601 datetime
  activity_type: ActivityType;
  status: WorkoutStatus;
  created_at: string;        // ISO 8601 datetime
  google_event_id?: string;
}

export interface WorkoutCreate {
  title: string;
  description?: string;
  start_time: string;        // ISO 8601 datetime
  end_time: string;          // ISO 8601 datetime
  activity_type: ActivityType;
  status?: WorkoutStatus;
}

export interface WorkoutUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  activity_type?: ActivityType;
  status?: WorkoutStatus;
}
