"""0002_challenge_management

Revision ID: 0002_challenge_management
Revises: 0001_auth_rbac_baseline
Create Date: 2026-09-04 10:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_challenge_management"
down_revision: Union[str, None] = "0001_auth_rbac_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update departments table
    op.execute("""
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS state VARCHAR(100);
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
    """)

    # 2. Update challenges table with Step 3 fields
    op.execute("""
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_code VARCHAR(50);
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) REFERENCES users(id);
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS current_state TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS desired_outcome TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_description TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS target_beneficiaries TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS technology_preferences TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS technology_restrictions TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS geographical_scope VARCHAR(100);
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS budget_min NUMERIC(14, 2);
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS budget_max NUMERIC(14, 2);
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR' NOT NULL;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS pilot_duration_days INTEGER DEFAULT 90 NOT NULL;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS pilot_start_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS data_requirements TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS security_requirements TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS compliance_requirements TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS intellectual_property_requirements TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS eligibility_requirements TEXT;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE challenges ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

    -- Backfill legacy records if columns exist and desired_outcome is NULL
    DO $$ 
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='outcome_definition') THEN
            UPDATE challenges SET desired_outcome = outcome_definition WHERE desired_outcome IS NULL AND outcome_definition IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='target_sector') THEN
            UPDATE challenges SET domain = target_sector WHERE domain IS NULL AND target_sector IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='budget_estimate') THEN
            UPDATE challenges SET budget_max = budget_estimate WHERE budget_max IS NULL AND budget_estimate IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='pilot_duration_months') THEN
            UPDATE challenges SET pilot_duration_days = CAST(ROUND(pilot_duration_months * 30) AS INTEGER) 
            WHERE pilot_duration_days = 90 AND pilot_duration_months IS NOT NULL AND pilot_duration_months != 3.0;
        END IF;
    END $$;

    -- Generate challenge code for any existing challenges without one
    WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS seq FROM challenges WHERE challenge_code IS NULL
    )
    UPDATE challenges c
    SET challenge_code = 'GI-2026-' || LPAD(CAST(n.seq AS VARCHAR), 4, '0')
    FROM numbered n
    WHERE c.id = n.id;

    -- Assign created_by fallback to first admin or government user if null
    UPDATE challenges
    SET created_by = (SELECT id FROM users WHERE role IN ('GOVERNMENT', 'ADMIN') LIMIT 1)
    WHERE created_by IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS ix_challenges_challenge_code ON challenges(challenge_code);
    CREATE INDEX IF NOT EXISTS ix_challenges_domain ON challenges(domain);
    CREATE INDEX IF NOT EXISTS ix_challenges_created_by ON challenges(created_by);
    """)

    # 3. Create challenge_kpis table
    op.execute("""
    CREATE TABLE IF NOT EXISTS challenge_kpis (
        id VARCHAR(36) PRIMARY KEY,
        challenge_id VARCHAR(36) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        measurement_unit VARCHAR(50) NOT NULL,
        baseline_value NUMERIC(14, 4),
        target_value NUMERIC(14, 4) NOT NULL,
        measurement_method TEXT,
        weight NUMERIC(5, 2) DEFAULT 1.0 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_challenge_kpis_challenge_id ON challenge_kpis(challenge_id);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS challenge_kpis;
    DROP INDEX IF EXISTS ix_challenges_challenge_code;
    DROP INDEX IF EXISTS ix_challenges_domain;
    DROP INDEX IF EXISTS ix_challenges_created_by;
    """)
