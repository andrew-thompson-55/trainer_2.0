ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_workout_time TEXT DEFAULT '06:00';
