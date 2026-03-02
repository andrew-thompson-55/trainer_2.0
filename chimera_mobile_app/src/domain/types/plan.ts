// Training Plan domain types

export interface TrainingPhase {
  id: string;
  user_id: string;
  title: string;
  phase_type: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'race' | 'custom';
  start_date: string; // YYYY-MM-DD
  end_date: string;
  parent_phase_id: string | null;
  color: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanTemplate {
  id: string;
  user_id: string;
  title: string;
  template_type: 'workout' | 'week' | 'phase';
  content: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentAction {
  id: string;
  user_id: string;
  action_type: string;
  description: string;
  snapshot_before: any;
  snapshot_after: any;
  affected_table: string | null;
  affected_ids: string[];
  reverted: boolean;
  reverted_at: string | null;
  created_at: string;
}

export interface CalendarActivity {
  id: string;
  start_time: string;
  original_activity_type: string;
  distance_meters: number | null;
  moving_time_seconds: number | null;
  planned_workout_id: string | null;
  source_type: string;
  total_elevation_gain: number | null;
}

export interface TimelineWeekData {
  weekStart: Date;
  actualVolumeMi: number;
  actualElevationFt: number;
  isPast: boolean;
  isCurrentWeek: boolean;
}

export interface CalendarData {
  phases: TrainingPhase[];
  workouts: import('./workout').Workout[];
  activities: CalendarActivity[];
}
