"""0003_startup_application_system

Revision ID: 0003_startup_application_system
Revises: 0002_challenge_management
Create Date: 2026-09-04 13:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_startup_application_system"
down_revision: Union[str, None] = "0002_challenge_management"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update startups table
    op.execute("""
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) REFERENCES users(id);
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS startup_name VARCHAR(255);
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS founded_year INTEGER;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS headquarters VARCHAR(255);
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS team_size VARCHAR(50);
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS dpiit_recognition_number VARCHAR(100);
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS recognition_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS technology_domains TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS solution_categories TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS product_stage VARCHAR(50) DEFAULT 'MVP' NOT NULL;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS operating_regions TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS previous_deployments TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS government_experience TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS certifications TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS cybersecurity_certifications TEXT;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

    -- Make legacy columns nullable for flexible onboarding
    ALTER TABLE startups ALTER COLUMN company_name DROP NOT NULL;
    ALTER TABLE startups ALTER COLUMN sector DROP NOT NULL;
    ALTER TABLE startups ALTER COLUMN stage DROP NOT NULL;

    -- Backfill legacy records if columns exist
    DO $$ 
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='company_name') THEN
            UPDATE startups SET startup_name = company_name WHERE startup_name IS NULL AND company_name IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='dpiit_number') THEN
            UPDATE startups SET dpiit_recognition_number = dpiit_number WHERE dpiit_recognition_number IS NULL AND dpiit_number IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='stage') THEN
            UPDATE startups SET product_stage = stage WHERE product_stage IS NULL AND stage IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='sector') THEN
            UPDATE startups SET technology_domains = '["' || sector || '"]' WHERE technology_domains IS NULL AND sector IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='dpiit_recognized') THEN
            UPDATE startups SET recognition_status = 'VERIFIED' WHERE dpiit_recognized = TRUE;
        END IF;
    END $$;
    """)

    # 2. Update applications table
    op.execute("""
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_code VARCHAR(50);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(36) REFERENCES users(id);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS proposal_title VARCHAR(255);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS executive_summary TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS problem_understanding TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS proposed_solution TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS expected_outcomes TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS implementation_plan TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS pilot_plan TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS timeline_days INTEGER;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS risks TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS dependencies TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS team_capabilities TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS previous_deployments TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS estimated_cost DOUBLE PRECISION;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS requested_budget DOUBLE PRECISION;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS data_requirements TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS security_approach TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS ip_approach TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS supporting_documents TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS eligibility_snapshot TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_notes TEXT;

    -- Make proposal_summary, technical_approach, submitted_at nullable for draft states
    ALTER TABLE applications ALTER COLUMN proposal_summary DROP NOT NULL;
    ALTER TABLE applications ALTER COLUMN technical_approach DROP NOT NULL;
    ALTER TABLE applications ALTER COLUMN submitted_at DROP NOT NULL;

    -- Backfill legacy applications
    UPDATE applications SET executive_summary = proposal_summary WHERE executive_summary IS NULL AND proposal_summary IS NOT NULL;
    UPDATE applications SET proposal_title = 'Technical Proposal for Challenge ' || SUBSTRING(challenge_id FROM 1 FOR 8) WHERE proposal_title IS NULL;
    UPDATE applications SET application_code = 'APP-2026-' || LPAD(CAST(FLOOR(RANDOM() * 8999 + 1000) AS VARCHAR), 4, '0') WHERE application_code IS NULL;

    -- Create indexes
    CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_code ON applications(application_code);
    CREATE INDEX IF NOT EXISTS ix_applications_challenge_startup ON applications(challenge_id, startup_id);
    CREATE INDEX IF NOT EXISTS ix_startups_user_id ON startups(user_id);
    CREATE INDEX IF NOT EXISTS ix_startups_dpiit_recognition_number ON startups(dpiit_recognition_number);
    """)


def downgrade() -> None:
    pass
