-- Migration 005: Import enhancements
-- Adds source column to planned_workouts for tracking how workouts were created.
-- Status column is already TEXT, so 'tentative'/'cancelled' values need no migration.

ALTER TABLE planned_workouts
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
