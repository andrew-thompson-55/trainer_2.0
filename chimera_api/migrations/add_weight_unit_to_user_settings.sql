ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS weight_unit TEXT NOT NULL DEFAULT 'kg'
  CHECK (weight_unit IN ('kg', 'lbs'));
