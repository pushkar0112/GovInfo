"""0008_scale_up_replication_impact

Revision ID: 0008_scale_up_replication_impact
Revises: 0007_procurement_contracts_payments
Create Date: 2026-09-06 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0008_scale_up_replication_impact"
down_revision: Union[str, None] = "0007_procurement_contracts_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. scale_up_decisions
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_up_decisions (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_code VARCHAR(50) NOT NULL UNIQUE,
        pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
        procurement_id VARCHAR(36) REFERENCES procurement_records(id) ON DELETE SET NULL,
        contract_id VARCHAR(36) REFERENCES contracts(id) ON DELETE SET NULL,
        startup_id VARCHAR(36) NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
        originating_department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        decision_type VARCHAR(50) NOT NULL,
        decision_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        rationale TEXT NOT NULL,
        expected_impact TEXT,
        estimated_scale_value NUMERIC(14, 2),
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        proposed_sites_count INTEGER DEFAULT 1 NOT NULL,
        proposed_regions VARCHAR(255),
        proposed_start_date DATE,
        proposed_end_date DATE,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reviewed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        decided_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS ix_scale_up_decisions_code ON scale_up_decisions(scale_up_code);
    CREATE INDEX IF NOT EXISTS ix_scale_up_decisions_pilot_id ON scale_up_decisions(pilot_id);
    CREATE INDEX IF NOT EXISTS ix_scale_up_decisions_startup_id ON scale_up_decisions(startup_id);
    CREATE INDEX IF NOT EXISTS ix_scale_up_decisions_dept_id ON scale_up_decisions(originating_department_id);
    CREATE INDEX IF NOT EXISTS ix_scale_up_decisions_status ON scale_up_decisions(decision_status);
    CREATE INDEX IF NOT EXISTS ix_scale_up_decisions_type ON scale_up_decisions(decision_type);
    """)

    # 2. scale_up_plans
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_up_plans (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_decision_id VARCHAR(36) NOT NULL REFERENCES scale_up_decisions(id) ON DELETE CASCADE,
        plan_code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        objective TEXT NOT NULL,
        scope TEXT NOT NULL,
        target_population VARCHAR(255),
        deployment_strategy VARCHAR(50) DEFAULT 'PHASED_ROLLOUT' NOT NULL,
        rollout_strategy VARCHAR(50),
        estimated_budget NUMERIC(14, 2) NOT NULL,
        approved_budget NUMERIC(14, 2),
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        target_sites INTEGER DEFAULT 1 NOT NULL,
        target_units INTEGER DEFAULT 1 NOT NULL,
        target_regions VARCHAR(255),
        start_date DATE,
        planned_end_date DATE,
        status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        approval_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS ix_scale_up_plans_code ON scale_up_plans(plan_code);
    CREATE INDEX IF NOT EXISTS ix_scale_up_plans_decision_id ON scale_up_plans(scale_up_decision_id);
    CREATE INDEX IF NOT EXISTS ix_scale_up_plans_status ON scale_up_plans(status);
    CREATE INDEX IF NOT EXISTS ix_scale_up_plans_approval_status ON scale_up_plans(approval_status);
    """)

    # 3. scale_targets
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_targets (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_type VARCHAR(50) DEFAULT 'SITE' NOT NULL,
        department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
        region VARCHAR(100),
        district VARCHAR(100),
        site_name VARCHAR(255),
        operational_unit VARCHAR(255),
        target_population INTEGER,
        planned_start_date DATE,
        planned_end_date DATE,
        budget NUMERIC(14, 2) DEFAULT 0.0 NOT NULL,
        status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL,
        progress_percentage FLOAT DEFAULT 0.0 NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_scale_targets_plan_id ON scale_targets(scale_up_plan_id);
    CREATE INDEX IF NOT EXISTS ix_scale_targets_dept_id ON scale_targets(department_id);
    CREATE INDEX IF NOT EXISTS ix_scale_targets_region ON scale_targets(region);
    CREATE INDEX IF NOT EXISTS ix_scale_targets_district ON scale_targets(district);
    CREATE INDEX IF NOT EXISTS ix_scale_targets_status ON scale_targets(status);
    """)

    # 4. replications
    op.execute("""
    CREATE TABLE IF NOT EXISTS replications (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        source_pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
        source_site VARCHAR(255) NOT NULL,
        target_site VARCHAR(255) NOT NULL,
        target_department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        adaptation_required BOOLEAN DEFAULT FALSE NOT NULL,
        adaptation_notes TEXT,
        local_constraints TEXT,
        deployment_status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL,
        lessons_learned TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_replications_plan_id ON replications(scale_up_plan_id);
    CREATE INDEX IF NOT EXISTS ix_replications_source_pilot ON replications(source_pilot_id);
    CREATE INDEX IF NOT EXISTS ix_replications_target_dept ON replications(target_department_id);
    CREATE INDEX IF NOT EXISTS ix_replications_status ON replications(deployment_status);
    """)

    # 5. scale_readiness_checks
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_readiness_checks (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        category VARCHAR(50) DEFAULT 'TECHNICAL' NOT NULL,
        check_name VARCHAR(255) NOT NULL,
        description TEXT,
        required BOOLEAN DEFAULT TRUE NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        evidence_document_id VARCHAR(36),
        reviewer_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        reviewer_comments TEXT,
        completed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS ix_scale_readiness_plan_id ON scale_readiness_checks(scale_up_plan_id);
    CREATE INDEX IF NOT EXISTS ix_scale_readiness_status ON scale_readiness_checks(status);
    """)

    # 6. scale_up_approvals
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_up_approvals (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        approval_type VARCHAR(50) DEFAULT 'GOVERNMENT_APPROVAL' NOT NULL,
        approver_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        comments TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS ix_scale_up_approvals_plan_id ON scale_up_approvals(scale_up_plan_id);
    CREATE INDEX IF NOT EXISTS ix_scale_up_approvals_approver ON scale_up_approvals(approver_id);
    CREATE INDEX IF NOT EXISTS ix_scale_up_approvals_status ON scale_up_approvals(status);
    """)

    # 7. scale_phases
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_phases (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        phase_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        objective TEXT,
        target_count INTEGER DEFAULT 1 NOT NULL,
        budget NUMERIC(14, 2) DEFAULT 0.0 NOT NULL,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL,
        completion_percentage FLOAT DEFAULT 0.0 NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_scale_phases_plan_id ON scale_phases(scale_up_plan_id);
    CREATE INDEX IF NOT EXISTS ix_scale_phases_status ON scale_phases(status);
    """)

    # 8. scale_milestones
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_milestones (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_phase_id VARCHAR(36) NOT NULL REFERENCES scale_phases(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sequence_number INTEGER DEFAULT 1 NOT NULL,
        weight FLOAT DEFAULT 1.0 NOT NULL,
        due_date DATE,
        completion_percentage FLOAT DEFAULT 0.0 NOT NULL,
        status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL,
        acceptance_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS ix_scale_milestones_phase_id ON scale_milestones(scale_phase_id);
    """)

    # 9. scale_deployment_updates
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_deployment_updates (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_target_id VARCHAR(36) NOT NULL REFERENCES scale_targets(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        completion_percentage FLOAT NOT NULL,
        update_text TEXT NOT NULL,
        blockers TEXT,
        submitted_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        reviewed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_comments TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_scale_deployment_target_id ON scale_deployment_updates(scale_target_id);
    """)

    # 10. impact_metrics
    op.execute("""
    CREATE TABLE IF NOT EXISTS impact_metrics (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) DEFAULT 'SERVICE_DELIVERY' NOT NULL,
        unit VARCHAR(50) NOT NULL,
        baseline_value FLOAT NOT NULL,
        target_value FLOAT NOT NULL,
        actual_value FLOAT,
        direction VARCHAR(50) DEFAULT 'HIGHER_IS_BETTER' NOT NULL,
        weight FLOAT DEFAULT 1.0 NOT NULL,
        is_critical BOOLEAN DEFAULT FALSE NOT NULL,
        measurement_date DATE,
        data_source VARCHAR(255),
        verification_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_impact_metrics_plan_id ON impact_metrics(scale_up_plan_id);
    CREATE INDEX IF NOT EXISTS ix_impact_metrics_category ON impact_metrics(category);
    CREATE INDEX IF NOT EXISTS ix_impact_metrics_code ON impact_metrics(code);
    """)

    # 11. impact_measurements
    op.execute("""
    CREATE TABLE IF NOT EXISTS impact_measurements (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        impact_metric_id VARCHAR(36) NOT NULL REFERENCES impact_metrics(id) ON DELETE CASCADE,
        value FLOAT NOT NULL,
        measurement_date DATE NOT NULL,
        sample_size INTEGER,
        confidence_interval VARCHAR(100),
        data_source VARCHAR(255),
        recorded_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        evidence_id VARCHAR(36),
        notes TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_impact_measurements_metric_id ON impact_measurements(impact_metric_id);
    CREATE INDEX IF NOT EXISTS ix_impact_measurements_date ON impact_measurements(measurement_date);
    """)

    # 12. impact_evidence
    op.execute("""
    CREATE TABLE IF NOT EXISTS impact_evidence (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        impact_metric_id VARCHAR(36) NOT NULL REFERENCES impact_metrics(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        storage_key VARCHAR(500) NOT NULL,
        checksum VARCHAR(128) NOT NULL,
        version INTEGER DEFAULT 1 NOT NULL,
        verification_status VARCHAR(50) DEFAULT 'VERIFIED' NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_impact_evidence_metric_id ON impact_evidence(impact_metric_id);
    """)

    # 13. scale_outcomes
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_outcomes (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        impact_score FLOAT NOT NULL,
        recommended_outcome VARCHAR(50) NOT NULL,
        confirmed_outcome VARCHAR(50) NOT NULL,
        confirmation_reason TEXT,
        confirmed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        confirmed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS ix_scale_outcomes_plan_id ON scale_outcomes(scale_up_plan_id);
    """)

    # 14. scale_beneficiary_metrics
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_beneficiary_metrics (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        category VARCHAR(50) DEFAULT 'DIRECT_BENEFICIARIES' NOT NULL,
        baseline_count INTEGER DEFAULT 0 NOT NULL,
        target_count INTEGER DEFAULT 0 NOT NULL,
        actual_count INTEGER DEFAULT 0 NOT NULL,
        measurement_date DATE,
        data_source VARCHAR(255),
        verification_status VARCHAR(50) DEFAULT 'VERIFIED' NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_scale_beneficiaries_plan_id ON scale_beneficiary_metrics(scale_up_plan_id);
    """)

    # 15. scale_risks
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_risks (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'OPERATIONAL' NOT NULL,
        severity VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL,
        likelihood VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL,
        mitigation TEXT,
        owner VARCHAR(255),
        status VARCHAR(50) DEFAULT 'OPEN' NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_scale_risks_plan_id ON scale_risks(scale_up_plan_id);
    """)

    # 16. scale_lessons
    op.execute("""
    CREATE TABLE IF NOT EXISTS scale_lessons (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        scale_up_plan_id VARCHAR(36) NOT NULL REFERENCES scale_up_plans(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'OPERATIONAL' NOT NULL,
        recommendation TEXT NOT NULL,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS ix_scale_lessons_plan_id ON scale_lessons(scale_up_plan_id);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS scale_lessons CASCADE;
    DROP TABLE IF EXISTS scale_risks CASCADE;
    DROP TABLE IF EXISTS scale_beneficiary_metrics CASCADE;
    DROP TABLE IF EXISTS scale_outcomes CASCADE;
    DROP TABLE IF EXISTS impact_evidence CASCADE;
    DROP TABLE IF EXISTS impact_measurements CASCADE;
    DROP TABLE IF EXISTS impact_metrics CASCADE;
    DROP TABLE IF EXISTS scale_deployment_updates CASCADE;
    DROP TABLE IF EXISTS scale_milestones CASCADE;
    DROP TABLE IF EXISTS scale_phases CASCADE;
    DROP TABLE IF EXISTS scale_up_approvals CASCADE;
    DROP TABLE IF EXISTS scale_readiness_checks CASCADE;
    DROP TABLE IF EXISTS replications CASCADE;
    DROP TABLE IF EXISTS scale_targets CASCADE;
    DROP TABLE IF EXISTS scale_up_plans CASCADE;
    DROP TABLE IF EXISTS scale_up_decisions CASCADE;
    """)
