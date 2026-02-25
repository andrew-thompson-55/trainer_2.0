export interface WeeklyMetric {
  week_start: string;
  volume_m: number;
  vert_m: number;
  duration_s: number;
  avg_hr: number | null;
  long_run_m: number;
  body_weight: number | null;
}

export interface RecentActivity {
  id: string;
  name: string;
  activity_type: string | null;
  start_time: string;
  distance_meters: number;
  moving_time_seconds: number;
  total_elevation_gain: number;
  average_heartrate: number | null;
  session_rpe: number | null;
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
}

export interface DashboardData {
  weekly_metrics: WeeklyMetric[];
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
  settings: { distance_unit: 'mi' | 'km' };
}
