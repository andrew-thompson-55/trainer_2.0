export interface WeeklyMetric {
  week_start: string;
  volume_m: number;
  vert_m: number;
  duration_s: number;
  avg_hr: number | null;
  long_run_m: number;
  body_weight: number | null;
}

export interface PacedDelta {
  current: number;
  previous: number;
  delta_pct: number | null;
}

export interface PacedDeltas {
  volume_m: PacedDelta;
  vert_m: PacedDelta;
  duration_s: PacedDelta;
  long_run_m: PacedDelta;
}

export interface RecentActivity {
  id: string;
  name: string;
  activity_type: string | null;
  original_activity_type?: string | null;
  start_time: string;
  distance_meters: number;
  moving_time_seconds: number;
  total_elevation_gain: number;
  average_heartrate: number | null;
  session_rpe: number | null;
  stats_included?: boolean;
}

export interface TodayCheckin {
  readiness: number;
  soreness: number;
  energy: number;
  mood: number;
}

export interface UpcomingWorkout {
  id: string;
  title: string;
  activity_type: string;
  start_time: string;
  description: string | null;
  status: string;
  is_today: boolean;
}

export interface ComplianceData {
  score: number;
  compliant_days: number;
  total_days: number;
  current_week: { compliant: number; total: number };
  by_week: { week_start: string; compliant: number; total: number }[];
}

export interface DashboardData {
  weekly_metrics: WeeklyMetric[];
  paced_deltas: PacedDeltas;
  recent_activities: RecentActivity[];
  today: {
    checkin: TodayCheckin | null;
    streak: number;
  };
  upcoming_workouts: UpcomingWorkout[];
  week_summary: {
    runs: number;
    miles: number;
    vert_ft: number;
  };
  race: { name: string; date: string } | null;
  compliance: ComplianceData | null;
  settings: { distance_unit: 'mi' | 'km' };
}
