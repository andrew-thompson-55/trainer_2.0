-- Migration 006: Race Calendar Planning
-- Adds races table, phase modifiers, and workout pinning

-- 1. Races table
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  race_type TEXT NOT NULL CHECK (race_type IN ('A', 'B', 'C')),
  distance TEXT,
  url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_races_user_date ON races(user_id, date);

-- 2. Training phase modifiers (for vacations, travel, etc.)
ALTER TABLE training_phases
  ADD COLUMN IF NOT EXISTS intensity_modifier REAL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS frequency_modifier REAL DEFAULT 1.0;

-- 3. Workout pinning (user-touched = pinned, AI respects pins)
ALTER TABLE planned_workouts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
