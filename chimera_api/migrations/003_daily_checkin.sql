-- Migration: Replace daily_logs with daily_checkin
-- Run manually against Supabase SQL editor

-- ============================================================
-- 1. Create daily_checkin table
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_checkin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('morning_checkin', 'workout_update')),

    -- Morning check-in metrics (1-5 scale)
    readiness INT CHECK (readiness BETWEEN 1 AND 5),
    soreness INT CHECK (soreness BETWEEN 1 AND 5),
    energy INT CHECK (energy BETWEEN 1 AND 5),
    mood INT CHECK (mood BETWEEN 1 AND 5),

    -- Optional note
    note TEXT,

    -- Workout update fields
    strava_activity_id TEXT,
    session_rpe INT CHECK (session_rpe BETWEEN 1 AND 5),

    -- Body weight (morning checkin only)
    body_weight DECIMAL,
    body_weight_unit TEXT DEFAULT 'lbs' CHECK (body_weight_unit IN ('kg', 'lbs')),

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daily_checkin_user_date ON daily_checkin(user_id, date);
CREATE INDEX idx_daily_checkin_strava ON daily_checkin(strava_activity_id) WHERE strava_activity_id IS NOT NULL;

-- Only one morning checkin per user per day
CREATE UNIQUE INDEX uq_daily_checkin_morning
    ON daily_checkin(user_id, date)
    WHERE entry_type = 'morning_checkin';

-- Only one workout update per strava activity
CREATE UNIQUE INDEX uq_daily_checkin_strava_activity
    ON daily_checkin(user_id, strava_activity_id)
    WHERE strava_activity_id IS NOT NULL;

-- Enable RLS
ALTER TABLE daily_checkin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checkins"
    ON daily_checkin FOR ALL
    USING (user_id = auth.uid());

-- ============================================================
-- 2. Migrate data from daily_logs (if table exists)
-- ============================================================
-- Maps: motivation → readiness, soreness → soreness, stress → mood (inverted)
-- Old scale was 1-10, new scale is 1-5, so we divide by 2 and round

INSERT INTO daily_checkin (user_id, date, entry_type, readiness, soreness, mood, body_weight, body_weight_unit)
SELECT
    user_id,
    date,
    'morning_checkin',
    LEAST(5, GREATEST(1, ROUND(motivation / 2.0)))::INT,
    LEAST(5, GREATEST(1, ROUND(soreness / 2.0)))::INT,
    LEAST(5, GREATEST(1, ROUND((10 - stress) / 2.0)))::INT,  -- Invert stress → mood
    body_weight_kg,
    'kg'
FROM daily_logs
WHERE motivation IS NOT NULL OR soreness IS NOT NULL OR stress IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Drop old daily_logs table
-- ============================================================
-- UNCOMMENT AFTER VERIFYING MIGRATION:
-- DROP TABLE IF EXISTS daily_logs;

-- ============================================================
-- 4. Add notification settings to user_settings
-- ============================================================
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS morning_checkin_reminder BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS morning_checkin_reminder_time TIME DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS workout_update_reminder BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS streak_reminder BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS streak_reminder_time TIME DEFAULT '10:00';
