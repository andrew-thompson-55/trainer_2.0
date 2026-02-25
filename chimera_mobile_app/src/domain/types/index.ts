// Domain types - Re-export all types

export type {
  ActivityType,
  WorkoutStatus,
  Workout,
  WorkoutCreate,
  WorkoutUpdate,
} from './workout';

export type {
  CheckinStatus,
  MorningCheckin,
  WorkoutUpdate as CheckinWorkoutUpdate,
  PendingWorkout,
  MorningCheckinCreate,
  WorkoutUpdateCreate,
} from './checkin';

export type {
  StravaActivity,
  StatItem,
} from './strava';

export type {
  User,
  ProfileUpdate,
  WeightUnit,
  DistanceUnit,
  HeightUnit,
  UserSettings,
} from './user';

export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from './chat';
