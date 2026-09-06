-- Migration 0006: KPI Independent Validation System
-- Step 7: KPI Measurement & Independent Validation

-- 1. Alter pilots table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='validation_status') THEN
        ALTER TABLE pilots ADD COLUMN validation_status VARCHAR(50) DEFAULT 'NOT_STARTED' NOT NULL;
        CREATE INDEX IF NOT EXISTS ix_pilots_validation_status ON pilots(validation_status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='validator_assessment') THEN
        ALTER TABLE pilots ADD COLUMN validator_assessment VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='classification_confirmed_by') THEN
        ALTER TABLE pilots ADD COLUMN classification_confirmed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='classification_confirmed_at') THEN
        ALTER TABLE pilots ADD COLUMN classification_confirmed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='classification_notes') THEN
        ALTER TABLE pilots ADD COLUMN classification_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pilots' AND column_name='classification_divergence_reason') THEN
        ALTER TABLE pilots ADD COLUMN classification_divergence_reason TEXT;
    END IF;
END $$;

-- 2. Create pilot_kpis table
CREATE TABLE IF NOT EXISTS pilot_kpis (
    id VARCHAR(36) PRIMARY KEY,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'IMPACT' NOT NULL,
    measurement_type VARCHAR(50) DEFAULT 'NUMBER' NOT NULL,
    unit VARCHAR(50) NOT NULL,
    baseline_value NUMERIC(14, 4),
    baseline_date DATE,
    baseline_source VARCHAR(255),
    baseline_notes TEXT,
    target_value NUMERIC(14, 4) NOT NULL,
    target_date DATE,
    target_operator VARCHAR(50) DEFAULT 'GREATER_THAN_OR_EQUAL' NOT NULL,
    direction VARCHAR(50) DEFAULT 'HIGHER_IS_BETTER' NOT NULL,
    weight NUMERIC(5, 2) DEFAULT 1.0 NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    verification_method TEXT,
    data_source VARCHAR(255),
    target_description TEXT,
    created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_pilot_kpis_pilot_id ON pilot_kpis(pilot_id);
CREATE INDEX IF NOT EXISTS ix_pilot_kpis_category ON pilot_kpis(category);
CREATE INDEX IF NOT EXISTS ix_pilot_kpis_status ON pilot_kpis(status);
CREATE INDEX IF NOT EXISTS ix_pilot_kpis_created_at ON pilot_kpis(created_at);

-- 3. Create kpi_measurements table
CREATE TABLE IF NOT EXISTS kpi_measurements (
    id VARCHAR(36) PRIMARY KEY,
    kpi_id VARCHAR(36) NOT NULL REFERENCES pilot_kpis(id) ON DELETE CASCADE,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    measured_value NUMERIC(14, 4) NOT NULL,
    measurement_date DATE NOT NULL,
    reporting_period_start DATE,
    reporting_period_end DATE,
    measured_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    measurement_method TEXT,
    data_sources_used TEXT,
    sample_size INTEGER,
    calculation_notes TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_kpi_measurements_kpi_id ON kpi_measurements(kpi_id);
CREATE INDEX IF NOT EXISTS ix_kpi_measurements_pilot_id ON kpi_measurements(pilot_id);
CREATE INDEX IF NOT EXISTS ix_kpi_measurements_status ON kpi_measurements(status);
CREATE INDEX IF NOT EXISTS ix_kpi_measurements_date ON kpi_measurements(measurement_date);
CREATE INDEX IF NOT EXISTS ix_kpi_measurements_kpi_date ON kpi_measurements(kpi_id, measurement_date);

-- 4. Create kpi_evidences table
CREATE TABLE IF NOT EXISTS kpi_evidences (
    id VARCHAR(36) PRIMARY KEY,
    kpi_id VARCHAR(36) NOT NULL REFERENCES pilot_kpis(id) ON DELETE CASCADE,
    measurement_id VARCHAR(36) REFERENCES kpi_measurements(id) ON DELETE SET NULL,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(50) DEFAULT 'DATASET' NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    source VARCHAR(255),
    status VARCHAR(50) DEFAULT 'UPLOADED' NOT NULL,
    submitted_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_kpi_evidences_kpi_id ON kpi_evidences(kpi_id);
CREATE INDEX IF NOT EXISTS ix_kpi_evidences_measurement_id ON kpi_evidences(measurement_id);
CREATE INDEX IF NOT EXISTS ix_kpi_evidences_pilot_id ON kpi_evidences(pilot_id);
CREATE INDEX IF NOT EXISTS ix_kpi_evidences_status ON kpi_evidences(status);
CREATE INDEX IF NOT EXISTS ix_kpi_evidences_kpi_version ON kpi_evidences(kpi_id, version);

-- 5. Create validator_profiles table
CREATE TABLE IF NOT EXISTS validator_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization VARCHAR(255) NOT NULL,
    domain_expertise TEXT,
    qualifications TEXT,
    accreditations TEXT,
    years_of_experience INTEGER DEFAULT 0,
    validation_count INTEGER DEFAULT 0,
    rating NUMERIC(3, 2),
    availability VARCHAR(50) DEFAULT 'AVAILABLE' NOT NULL,
    contact_phone VARCHAR(50),
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_validator_profiles_user_id ON validator_profiles(user_id);
CREATE INDEX IF NOT EXISTS ix_validator_profiles_availability ON validator_profiles(availability);

-- 6. Create validation_assignments table
CREATE TABLE IF NOT EXISTS validation_assignments (
    id VARCHAR(36) PRIMARY KEY,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    validator_id VARCHAR(36) NOT NULL REFERENCES validator_profiles(id) ON DELETE CASCADE,
    assigned_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scope TEXT,
    terms_of_reference TEXT,
    status VARCHAR(50) DEFAULT 'ASSIGNED' NOT NULL,
    coi_declared BOOLEAN DEFAULT FALSE NOT NULL,
    coi_status VARCHAR(50) DEFAULT 'NO_CONFLICT' NOT NULL,
    coi_declaration_date TIMESTAMP WITH TIME ZONE,
    coi_details TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    decline_reason TEXT,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_val_assignments_pilot_id ON validation_assignments(pilot_id);
CREATE INDEX IF NOT EXISTS ix_val_assignments_validator_id ON validation_assignments(validator_id);
CREATE INDEX IF NOT EXISTS ix_val_assignments_status ON validation_assignments(status);
CREATE INDEX IF NOT EXISTS ix_val_assignments_coi_status ON validation_assignments(coi_status);

-- 7. Create validator_conflicts_of_interest table
CREATE TABLE IF NOT EXISTS validator_conflicts_of_interest (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL REFERENCES validation_assignments(id) ON DELETE CASCADE,
    validator_id VARCHAR(36) NOT NULL REFERENCES validator_profiles(id) ON DELETE CASCADE,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    declaration VARCHAR(50) DEFAULT 'NO_CONFLICT' NOT NULL,
    has_financial_interest BOOLEAN DEFAULT FALSE NOT NULL,
    has_past_employment BOOLEAN DEFAULT FALSE NOT NULL,
    has_personal_relationship BOOLEAN DEFAULT FALSE NOT NULL,
    has_competitive_interest BOOLEAN DEFAULT FALSE NOT NULL,
    declaration_details TEXT,
    mitigation_notes TEXT,
    is_cleared BOOLEAN DEFAULT TRUE NOT NULL,
    cleared_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    cleared_at TIMESTAMP WITH TIME ZONE,
    declared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_val_coi_assignment_id ON validator_conflicts_of_interest(assignment_id);
CREATE INDEX IF NOT EXISTS ix_val_coi_validator_id ON validator_conflicts_of_interest(validator_id);
CREATE INDEX IF NOT EXISTS ix_val_coi_pilot_id ON validator_conflicts_of_interest(pilot_id);
CREATE INDEX IF NOT EXISTS ix_val_coi_declaration ON validator_conflicts_of_interest(declaration);

-- 8. Create validation_reports table
CREATE TABLE IF NOT EXISTS validation_reports (
    id VARCHAR(36) PRIMARY KEY,
    pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    validator_id VARCHAR(36) NOT NULL REFERENCES validator_profiles(id) ON DELETE CASCADE,
    assignment_id VARCHAR(36) NOT NULL REFERENCES validation_assignments(id) ON DELETE CASCADE,
    executive_summary TEXT,
    methodology TEXT,
    overall_assessment VARCHAR(50) DEFAULT 'INCONCLUSIVE' NOT NULL,
    overall_achievement_percentage NUMERIC(5, 2),
    kpis_achieved_count INTEGER DEFAULT 0,
    kpis_total_count INTEGER DEFAULT 0,
    confidence_level VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL,
    findings TEXT,
    unintended_effects TEXT,
    recommendations TEXT,
    readiness_assessment TEXT,
    risks_and_limitations TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reopened_at TIMESTAMP WITH TIME ZONE,
    reopened_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    reopen_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_val_reports_pilot_id ON validation_reports(pilot_id);
CREATE INDEX IF NOT EXISTS ix_val_reports_validator_id ON validation_reports(validator_id);
CREATE INDEX IF NOT EXISTS ix_val_reports_assignment_id ON validation_reports(assignment_id);
CREATE INDEX IF NOT EXISTS ix_val_reports_status ON validation_reports(status);
CREATE INDEX IF NOT EXISTS ix_val_reports_overall_assessment ON validation_reports(overall_assessment);

-- 9. Create kpi_validations table
CREATE TABLE IF NOT EXISTS kpi_validations (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES validation_reports(id) ON DELETE CASCADE,
    kpi_id VARCHAR(36) NOT NULL REFERENCES pilot_kpis(id) ON DELETE CASCADE,
    validator_measured_value NUMERIC(14, 4),
    result VARCHAR(50) DEFAULT 'NOT_VALIDATED' NOT NULL,
    achievement_percentage NUMERIC(5, 2),
    evidence_sufficiency VARCHAR(50) DEFAULT 'SUFFICIENT',
    confidence_score NUMERIC(3, 2),
    methodology_notes TEXT,
    validator_commentary TEXT,
    divergence_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_kpi_vals_report_id ON kpi_validations(report_id);
CREATE INDEX IF NOT EXISTS ix_kpi_vals_kpi_id ON kpi_validations(kpi_id);
CREATE INDEX IF NOT EXISTS ix_kpi_vals_result ON kpi_validations(result);

-- Update Alembic revision version to 0006
INSERT INTO alembic_version (version_num) VALUES ('0006_kpi_independent_validation_system')
ON CONFLICT (version_num) DO NOTHING;
DELETE FROM alembic_version WHERE version_num = '0005_pilot_milestone_deliverable_system';
