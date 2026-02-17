// Strava types - Activity data from Strava API

export interface StravaActivity {
  id: string;
  strava_id: number;
  activity_type: string;
  distance_meters: number;
  moving_time_seconds: number;
  average_heartrate?: number;
  source_type: 'STRAVA';
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
}
