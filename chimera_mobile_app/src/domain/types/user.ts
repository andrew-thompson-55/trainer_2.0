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

export interface UserSettings {
  weight_unit: WeightUnit;
  morning_checkin_reminder?: boolean;
  morning_checkin_reminder_time?: string;
  workout_update_reminder?: boolean;
  streak_reminder?: boolean;
  streak_reminder_time?: string;
}
