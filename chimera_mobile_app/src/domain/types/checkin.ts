export interface MorningCheckin {
  id: string;
  user_id: string;
  date: string;
  entry_type: 'morning_checkin';
  readiness: number | null;
  soreness: number | null;
  energy: number | null;
  mood: number | null;
  note: string | null;
  body_weight: number | null;
  body_weight_unit: string;
  created_at: string;
}

export interface WorkoutUpdate {
  id: string;
  user_id: string;
  date: string;
  entry_type: 'workout_update';
  strava_activity_id: string;
  session_rpe: number | null;
  created_at: string;
}

export interface PendingWorkout {
  id: string;
  source_id: string;
  activity_type: string;
  start_time: string;
  distance_meters: number | null;
  moving_time_seconds: number | null;
}

export interface CheckinStatus {
  morning_checkin: MorningCheckin | null;
  workout_updates: WorkoutUpdate[];
  pending_workouts: PendingWorkout[];
  streak: number;
}

export interface MorningCheckinCreate {
  readiness?: number;
  soreness?: number;
  energy?: number;
  mood?: number;
  note?: string;
  body_weight?: number;
  body_weight_unit?: string;
}

export interface WorkoutUpdateCreate {
  session_rpe: number;
}
