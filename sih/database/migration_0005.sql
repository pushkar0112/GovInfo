-- 1. Ensure pilots table exists & upgrade with Step 6 operational columns
CREATE TABLE IF NOT EXISTS pilots (
    id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(36) NOT NULL REFERENCES applications(id),
    title VARCHAR(255),
    scope_of_work TEXT,
    duration_weeks INTEGER DEFAULT 12,
    sandbox_location VARCHAR(255),
    approved_budget NUMERIC(14, 2),
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='pilot_code') THEN
        ALTER TABLE pilots ADD COLUMN pilot_code VARCHAR(50);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_pilots_pilot_code ON pilots(pilot_code);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='challenge_id') THEN
        ALTER TABLE pilots ADD COLUMN challenge_id VARCHAR(36) REFERENCES challenges(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_pilots_challenge_id ON pilots(challenge_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='startup_id') THEN
        ALTER TABLE pilots ADD COLUMN startup_id VARCHAR(36) REFERENCES startups(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_pilots_startup_id ON pilots(startup_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='government_department_id') THEN
        ALTER TABLE pilots ADD COLUMN government_department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_pilots_government_department_id ON pilots(government_department_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='pilot_title') THEN
        ALTER TABLE pilots ADD COLUMN pilot_title VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='objective') THEN
        ALTER TABLE pilots ADD COLUMN objective TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scope') THEN
        ALTER TABLE pilots ADD COLUMN scope TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='problem_statement') THEN
        ALTER TABLE pilots ADD COLUMN problem_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='proposed_solution') THEN
        ALTER TABLE pilots ADD COLUMN proposed_solution TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='expected_outcomes') THEN
        ALTER TABLE pilots ADD COLUMN expected_outcomes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='pilot_location') THEN
        ALTER TABLE pilots ADD COLUMN pilot_location VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='operating_regions') THEN
        ALTER TABLE pilots ADD COLUMN operating_regions VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='planned_end_date') THEN
        ALTER TABLE pilots ADD COLUMN planned_end_date DATE;
        CREATE INDEX IF NOT EXISTS ix_pilots_planned_end_date ON pilots(planned_end_date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='actual_end_date') THEN
        ALTER TABLE pilots ADD COLUMN actual_end_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='duration_days') THEN
        ALTER TABLE pilots ADD COLUMN duration_days INTEGER DEFAULT 90 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='pilot_budget') THEN
        ALTER TABLE pilots ADD COLUMN pilot_budget NUMERIC(14, 2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='currency') THEN
        ALTER TABLE pilots ADD COLUMN currency VARCHAR(10) DEFAULT 'INR' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='government_owner_id') THEN
        ALTER TABLE pilots ADD COLUMN government_owner_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_pilots_government_owner_id ON pilots(government_owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='startup_owner_id') THEN
        ALTER TABLE pilots ADD COLUMN startup_owner_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_pilots_startup_owner_id ON pilots(startup_owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='approval_status') THEN
        ALTER TABLE pilots ADD COLUMN approval_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='success_status') THEN
        ALTER TABLE pilots ADD COLUMN success_status VARCHAR(50) DEFAULT 'NOT_ASSESSED' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='rejection_reason') THEN
        ALTER TABLE pilots ADD COLUMN rejection_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='cancellation_reason') THEN
        ALTER TABLE pilots ADD COLUMN cancellation_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='created_by') THEN
        ALTER TABLE pilots ADD COLUMN created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Sync values from legacy columns where appropriate
    UPDATE pilots SET pilot_title = title WHERE pilot_title IS NULL AND title IS NOT NULL;
    UPDATE pilots SET scope = scope_of_work WHERE scope IS NULL AND scope_of_work IS NOT NULL;
    UPDATE pilots SET pilot_location = sandbox_location WHERE pilot_location IS NULL AND sandbox_location IS NOT NULL;
    UPDATE pilots SET pilot_budget = approved_budget WHERE pilot_budget IS NULL AND approved_budget IS NOT NULL;
    UPDATE pilots SET planned_end_date = end_date WHERE planned_end_date IS NULL AND end_date IS NOT NULL;
END $$;

-- 2. Ensure milestones table exists & upgrade with Step 6 operational columns
CREATE TABLE IF NOT EXISTS milestones (
    id VARCHAR(36) PRIMARY KEY,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    deliverable_description TEXT,
    tranche_amount NUMERIC(12, 2) DEFAULT 0.0,
    due_date DATE,
    completion_date DATE,
    status VARCHAR(50) DEFAULT 'NOT_STARTED' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='milestone_code') THEN
        ALTER TABLE milestones ADD COLUMN milestone_code VARCHAR(50);
        CREATE INDEX IF NOT EXISTS ix_milestones_milestone_code ON milestones(milestone_code);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='objective') THEN
        ALTER TABLE milestones ADD COLUMN objective TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='description') THEN
        ALTER TABLE milestones ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='planned_start_date') THEN
        ALTER TABLE milestones ADD COLUMN planned_start_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='planned_end_date') THEN
        ALTER TABLE milestones ADD COLUMN planned_end_date DATE;
        CREATE INDEX IF NOT EXISTS ix_milestones_planned_end_date ON milestones(planned_end_date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='actual_start_date') THEN
        ALTER TABLE milestones ADD COLUMN actual_start_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='actual_end_date') THEN
        ALTER TABLE milestones ADD COLUMN actual_end_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='weight') THEN
        ALTER TABLE milestones ADD COLUMN weight NUMERIC(5, 2) DEFAULT 0.0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='completion_percentage') THEN
        ALTER TABLE milestones ADD COLUMN completion_percentage NUMERIC(5, 2) DEFAULT 0.0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='acceptance_status') THEN
        ALTER TABLE milestones ADD COLUMN acceptance_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='block_reason') THEN
        ALTER TABLE milestones ADD COLUMN block_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milestones' AND column_name='rejection_reason') THEN
        ALTER TABLE milestones ADD COLUMN rejection_reason TEXT;
    END IF;

    -- Sync values from legacy columns where appropriate
    UPDATE milestones SET description = deliverable_description WHERE description IS NULL AND deliverable_description IS NOT NULL;
    UPDATE milestones SET planned_end_date = due_date WHERE planned_end_date IS NULL AND due_date IS NOT NULL;
    UPDATE milestones SET actual_end_date = completion_date WHERE actual_end_date IS NULL AND completion_date IS NOT NULL;
END $$;

-- 3. Create pilot_deliverables table
CREATE TABLE IF NOT EXISTS pilot_deliverables (
    id VARCHAR(36) PRIMARY KEY,
    milestone_id VARCHAR(36) NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    submitted_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    submission_version INTEGER DEFAULT 1 NOT NULL,
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    review_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_deliverables_milestone_id ON pilot_deliverables(milestone_id);
CREATE INDEX IF NOT EXISTS ix_deliverables_pilot_id ON pilot_deliverables(pilot_id);
CREATE INDEX IF NOT EXISTS ix_deliverables_status ON pilot_deliverables(status);
CREATE INDEX IF NOT EXISTS ix_deliverables_submitted_at ON pilot_deliverables(submitted_at);
CREATE INDEX IF NOT EXISTS ix_deliverables_milestone_version ON pilot_deliverables(milestone_id, submission_version);

-- Update Alembic revision version
UPDATE alembic_version SET version_num = '0005_pilot_milestone_deliverable_system';
