-- Migration: Add training profile and coach notes columns to user_settings
-- Run this in Supabase SQL Editor

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS training_goals TEXT,
  ADD COLUMN IF NOT EXISTS target_race TEXT,
  ADD COLUMN IF NOT EXISTS target_race_date DATE,
  ADD COLUMN IF NOT EXISTS weekly_volume_target_hours REAL,
  ADD COLUMN IF NOT EXISTS preferred_workout_time TEXT,
  ADD COLUMN IF NOT EXISTS injury_notes TEXT,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT;
