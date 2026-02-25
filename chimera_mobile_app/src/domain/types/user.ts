// User types - Profile and auth

export interface User {
  id: string;
  email: string;
  name: string;
  timezone?: string;
  token?: string;         // JWT token (client-side only)
  isNewUser?: boolean;    // Onboarding flag (client-side only)
}

export interface ProfileUpdate {
  name?: string;
  timezone?: string;
}

export type WeightUnit = 'kg' | 'lbs';
export type DistanceUnit = 'mi' | 'km';
export type HeightUnit = 'in' | 'cm';

export interface UserSettings {
  weight_unit: WeightUnit;
  morning_checkin_reminder?: boolean;
  morning_checkin_reminder_time?: string;
  workout_update_reminder?: boolean;
  streak_reminder?: boolean;
  streak_reminder_time?: string;

  // Profile fields
  date_of_birth?: string;
  gender?: string;
  height_value?: number;
  height_unit?: HeightUnit;

  // Training profile
  training_experience?: string;
  primary_activities?: string[];
  weekly_training_days?: number;
  rest_day_preference?: string;
  rest_days?: string[];
  max_heart_rate?: number;

  // Distance unit
  distance_unit?: DistanceUnit;

  // Expanded notifications
  notification_weekly_summary?: boolean;
  notification_weekly_summary_day?: string;
  notification_weekly_summary_time?: string;

  // Strava connected state
  strava_athlete_id?: number;
  strava_athlete_name?: string;
}
