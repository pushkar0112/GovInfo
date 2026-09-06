"""0004_expert_evaluation_system

Revision ID: 0004_expert_evaluation_system
Revises: 0003_startup_application_system
Create Date: 2026-09-05 15:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004_expert_evaluation_system"
down_revision: Union[str, None] = "0003_startup_application_system"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create evaluation_criteria
    op.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_criteria (
        id VARCHAR(36) PRIMARY KEY,
        challenge_id VARCHAR(36) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        weight FLOAT NOT NULL,
        max_score FLOAT NOT NULL DEFAULT 10.0,
        min_score FLOAT NOT NULL DEFAULT 0.0,
        mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_evaluation_criteria_challenge_id ON evaluation_criteria(challenge_id);
    CREATE INDEX IF NOT EXISTS ix_evaluation_criteria_display_order ON evaluation_criteria(challenge_id, display_order);
    """)

    # 2. Create expert_profiles
    op.execute("""
    CREATE TABLE IF NOT EXISTS expert_profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        organization VARCHAR(255),
        designation VARCHAR(255),
        expertise_domains TEXT,
        years_of_experience INTEGER NOT NULL DEFAULT 0,
        professional_summary TEXT,
        certifications TEXT,
        linkedin_url VARCHAR(255),
        availability_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_expert_profiles_user_id ON expert_profiles(user_id);
    """)

    # 3. Create evaluation_assignments
    op.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_assignments (
        id VARCHAR(36) PRIMARY KEY,
        application_id VARCHAR(36) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        expert_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assignment_status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
        assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
        accepted_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        due_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_evaluation_assignments_app_id ON evaluation_assignments(application_id);
    CREATE INDEX IF NOT EXISTS ix_evaluation_assignments_expert_id ON evaluation_assignments(expert_id);
    CREATE INDEX IF NOT EXISTS ix_evaluation_assignments_status ON evaluation_assignments(assignment_status);
    CREATE INDEX IF NOT EXISTS ix_eval_assign_composite ON evaluation_assignments(application_id, expert_id, assignment_status);
    """)

    # 4. Create conflict_of_interest
    op.execute("""
    CREATE TABLE IF NOT EXISTS conflict_of_interest (
        id VARCHAR(36) PRIMARY KEY,
        assignment_id VARCHAR(36) NOT NULL UNIQUE REFERENCES evaluation_assignments(id) ON DELETE CASCADE,
        expert_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        declaration VARCHAR(50) NOT NULL,
        reason TEXT,
        declared_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_conflict_of_interest_assignment_id ON conflict_of_interest(assignment_id);
    CREATE INDEX IF NOT EXISTS ix_conflict_of_interest_expert_id ON conflict_of_interest(expert_id);
    """)

    # 5. Upgrade evaluations table
    op.execute("""
    ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS assignment_id VARCHAR(36) REFERENCES evaluation_assignments(id) ON DELETE SET NULL;
    ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS expert_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS overall_score FLOAT;
    ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS overall_comments TEXT;
    ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

    -- Make legacy columns nullable for criteria-driven evaluations
    ALTER TABLE evaluations ALTER COLUMN evaluator_id DROP NOT NULL;
    ALTER TABLE evaluations ALTER COLUMN technical_score DROP NOT NULL;
    ALTER TABLE evaluations ALTER COLUMN operational_score DROP NOT NULL;
    ALTER TABLE evaluations ALTER COLUMN commercial_score DROP NOT NULL;
    ALTER TABLE evaluations ALTER COLUMN composite_score DROP NOT NULL;
    ALTER TABLE evaluations ALTER COLUMN evaluator_feedback DROP NOT NULL;
    ALTER TABLE evaluations ALTER COLUMN is_finalized DROP NOT NULL;

    CREATE INDEX IF NOT EXISTS ix_evaluations_assignment_id ON evaluations(assignment_id);
    CREATE INDEX IF NOT EXISTS ix_evaluations_expert_id ON evaluations(expert_id);
    CREATE INDEX IF NOT EXISTS ix_evaluations_app_expert_submitted ON evaluations(application_id, expert_id, submitted_at);
    """)

    # 6. Create evaluation_scores
    op.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_scores (
        id VARCHAR(36) PRIMARY KEY,
        evaluation_id VARCHAR(36) NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        criterion_id VARCHAR(36) NOT NULL REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
        score FLOAT NOT NULL,
        comment TEXT,
        evidence_reference TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_evaluation_scores_eval_id ON evaluation_scores(evaluation_id);
    CREATE INDEX IF NOT EXISTS ix_evaluation_scores_criterion_id ON evaluation_scores(criterion_id);
    CREATE INDEX IF NOT EXISTS ix_evaluation_scores_composite ON evaluation_scores(evaluation_id, criterion_id);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS evaluation_scores CASCADE;
    DROP TABLE IF EXISTS conflict_of_interest CASCADE;
    DROP TABLE IF EXISTS evaluation_assignments CASCADE;
    DROP TABLE IF EXISTS expert_profiles CASCADE;
    DROP TABLE IF EXISTS evaluation_criteria CASCADE;
    ALTER TABLE evaluations DROP COLUMN IF EXISTS assignment_id;
    ALTER TABLE evaluations DROP COLUMN IF EXISTS expert_id;
    ALTER TABLE evaluations DROP COLUMN IF EXISTS overall_score;
    ALTER TABLE evaluations DROP COLUMN IF EXISTS overall_comments;
    ALTER TABLE evaluations DROP COLUMN IF EXISTS is_submitted;
    ALTER TABLE evaluations DROP COLUMN IF EXISTS submitted_at;
    """)
