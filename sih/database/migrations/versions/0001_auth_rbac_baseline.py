"""0001_auth_rbac_baseline

Revision ID: 0001_auth_rbac_baseline
Revises: 
Create Date: 2026-09-04 01:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_auth_rbac_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create departments table if not exists
    op.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        ministry VARCHAR(255) NOT NULL,
        state_or_central VARCHAR(50) DEFAULT 'Central' NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        nodal_officer_name VARCHAR(255),
        description TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_departments_name ON departments(name);
    CREATE INDEX IF NOT EXISTS ix_departments_code ON departments(code);
    """)

    # 2. Create startups table if not exists
    op.execute("""
    CREATE TABLE IF NOT EXISTS startups (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        company_name VARCHAR(255) NOT NULL UNIQUE,
        dpiit_recognized BOOLEAN DEFAULT FALSE NOT NULL,
        dpiit_number VARCHAR(100),
        sector VARCHAR(100) NOT NULL,
        stage VARCHAR(50) DEFAULT 'PROTOTYPE' NOT NULL,
        cin_llpin VARCHAR(50),
        website VARCHAR(255),
        pitch_deck_url VARCHAR(500)
    );
    CREATE INDEX IF NOT EXISTS ix_startups_company_name ON startups(company_name);
    CREATE INDEX IF NOT EXISTS ix_startups_dpiit_number ON startups(dpiit_number);
    """)

    # 3. Create users table if not exists with all required fields
    op.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'STARTUP' NOT NULL,
        organization_name VARCHAR(255),
        organization_id VARCHAR(36),
        designation VARCHAR(255),
        phone_number VARCHAR(50),
        domain_expertise VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE NOT NULL,
        last_login TIMESTAMP WITH TIME ZONE,
        department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
        startup_id VARCHAR(36) REFERENCES startups(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active);
    CREATE INDEX IF NOT EXISTS ix_users_organization_id ON users(organization_id);
    """)

    # 4. Handle migrations if users table previously existed without new columns
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hashed_password') THEN
                ALTER TABLE users RENAME COLUMN hashed_password TO password_hash;
            ELSE
                ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='organization_name') THEN
            ALTER TABLE users ADD COLUMN organization_name VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='organization_id') THEN
            ALTER TABLE users ADD COLUMN organization_id VARCHAR(36);
            CREATE INDEX IF NOT EXISTS ix_users_organization_id ON users(organization_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='designation') THEN
            ALTER TABLE users ADD COLUMN designation VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='domain_expertise') THEN
            ALTER TABLE users ADD COLUMN domain_expertise VARCHAR(500);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
            ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        END IF;
    END $$;
    """)

    # 5. Create audit_logs table
    op.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(36),
        ip_address VARCHAR(45),
        metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs CASCADE;")
    op.execute("DROP TABLE IF EXISTS users CASCADE;")
    op.execute("DROP TABLE IF EXISTS startups CASCADE;")
    op.execute("DROP TABLE IF EXISTS departments CASCADE;")
