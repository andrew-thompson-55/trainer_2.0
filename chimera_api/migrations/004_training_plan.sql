-- Migration: Training Plan Feature
-- Tables: training_phases, plan_templates, agent_actions
-- Alters: planned_workouts (sort_order, template_source_id)

-- 1. Training Phases
CREATE TABLE IF NOT EXISTS training_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    phase_type TEXT NOT NULL DEFAULT 'custom',  -- base, build, peak, taper, recovery, race, custom
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    parent_phase_id UUID REFERENCES training_phases(id) ON DELETE SET NULL,
    color TEXT,
    sort_order INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_training_phases_user_id ON training_phases(user_id);
CREATE INDEX idx_training_phases_dates ON training_phases(user_id, start_date, end_date);

-- 2. Plan Templates
CREATE TABLE IF NOT EXISTS plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    template_type TEXT NOT NULL DEFAULT 'workout',  -- workout, week, phase
    content JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_templates_user_id ON plan_templates(user_id);
CREATE INDEX idx_plan_templates_type ON plan_templates(user_id, template_type);

-- 3. Agent Actions
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    snapshot_before JSONB,
    snapshot_after JSONB,
    affected_table TEXT,
    affected_ids UUID[] DEFAULT '{}',
    reverted BOOLEAN DEFAULT FALSE,
    reverted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_actions_user_id ON agent_actions(user_id);
CREATE INDEX idx_agent_actions_created ON agent_actions(user_id, created_at DESC);

-- 4. Alter planned_workouts
ALTER TABLE planned_workouts
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS template_source_id UUID REFERENCES plan_templates(id) ON DELETE SET NULL;

-- 5. RLS Policies
ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_phases_user_policy ON training_phases
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY plan_templates_user_policy ON plan_templates
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY agent_actions_user_policy ON agent_actions
    FOR ALL USING (user_id = auth.uid());

-- 6. Updated_at trigger for training_phases
CREATE OR REPLACE FUNCTION update_training_phases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_training_phases_updated_at
    BEFORE UPDATE ON training_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_training_phases_updated_at();

-- 7. Updated_at trigger for plan_templates
CREATE OR REPLACE FUNCTION update_plan_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_plan_templates_updated_at
    BEFORE UPDATE ON plan_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_templates_updated_at();
