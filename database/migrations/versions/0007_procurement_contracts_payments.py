"""0007_procurement_contracts_payments

Revision ID: 0007_procurement_contracts_payments
Revises: 0006_kpi_independent_validation_system
Create Date: 2026-09-06 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0007_procurement_contracts_payments"
down_revision: Union[str, None] = "0006_kpi_independent_validation_system"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create procurement_pathways table
    op.execute("""
    CREATE TABLE IF NOT EXISTS procurement_pathways (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        authority_level VARCHAR(100) NOT NULL,
        requires_competitive_process BOOLEAN DEFAULT FALSE NOT NULL,
        requires_financial_approval BOOLEAN DEFAULT TRUE NOT NULL,
        requires_legal_review BOOLEAN DEFAULT TRUE NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_procurement_pathways_code ON procurement_pathways(code);
    CREATE INDEX IF NOT EXISTS ix_procurement_pathways_active ON procurement_pathways(active);
    """)

    # 2. Create procurement_decisions table
    op.execute("""
    CREATE TABLE IF NOT EXISTS procurement_decisions (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        procurement_code VARCHAR(50) NOT NULL UNIQUE,
        pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
        application_id VARCHAR(36) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        challenge_id VARCHAR(36) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        startup_id VARCHAR(36) NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
        government_department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        decision_type VARCHAR(50) NOT NULL,
        decision_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        rationale TEXT NOT NULL,
        outcome_summary TEXT,
        estimated_value NUMERIC(14, 2),
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        quantity INTEGER DEFAULT 1 NOT NULL,
        intended_scope TEXT,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reviewed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        decided_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS ix_proc_decisions_pilot ON procurement_decisions(pilot_id);
    CREATE INDEX IF NOT EXISTS ix_proc_decisions_startup ON procurement_decisions(startup_id);
    CREATE INDEX IF NOT EXISTS ix_proc_decisions_dept ON procurement_decisions(government_department_id);
    CREATE INDEX IF NOT EXISTS ix_proc_decisions_status ON procurement_decisions(decision_status);
    CREATE INDEX IF NOT EXISTS ix_proc_decisions_type ON procurement_decisions(decision_type);
    CREATE INDEX IF NOT EXISTS ix_proc_decisions_code ON procurement_decisions(procurement_code);
    """)

    # 3. Handle legacy procurement_records if exists and recreate with Step 8 schema
    op.execute("""
    DROP TABLE IF EXISTS procurement_documents CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS payment_tranches CASCADE;
    DROP TABLE IF EXISTS contract_milestones CASCADE;
    DROP TABLE IF EXISTS contracts CASCADE;
    DROP TABLE IF EXISTS procurement_approvals CASCADE;
    DROP TABLE IF EXISTS procurement_records CASCADE;

    CREATE TABLE procurement_records (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        procurement_code VARCHAR(50) NOT NULL UNIQUE,
        procurement_decision_id VARCHAR(36) NOT NULL REFERENCES procurement_decisions(id) ON DELETE CASCADE,
        pilot_id VARCHAR(36) NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
        startup_id VARCHAR(36) NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
        government_department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        pathway_id VARCHAR(36) NOT NULL REFERENCES procurement_pathways(id) ON DELETE RESTRICT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        scope TEXT NOT NULL,
        estimated_value NUMERIC(14, 2) NOT NULL,
        approved_value NUMERIC(14, 2),
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        quantity INTEGER DEFAULT 1 NOT NULL,
        start_date DATE,
        planned_end_date DATE,
        status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        approval_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        acknowledgement_confirmed BOOLEAN DEFAULT FALSE NOT NULL,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE INDEX ix_proc_records_code ON procurement_records(procurement_code);
    CREATE INDEX ix_proc_records_pilot ON procurement_records(pilot_id);
    CREATE INDEX ix_proc_records_startup ON procurement_records(startup_id);
    CREATE INDEX ix_proc_records_dept ON procurement_records(government_department_id);
    CREATE INDEX ix_proc_records_status ON procurement_records(status);
    CREATE INDEX ix_proc_records_decision ON procurement_records(procurement_decision_id);
    CREATE INDEX ix_proc_records_pathway ON procurement_records(pathway_id);
    """)

    # 4. Create procurement_approvals table
    op.execute("""
    CREATE TABLE procurement_approvals (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        procurement_id VARCHAR(36) NOT NULL REFERENCES procurement_records(id) ON DELETE CASCADE,
        approval_type VARCHAR(50) NOT NULL,
        approver_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        comments TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX ix_proc_approvals_proc ON procurement_approvals(procurement_id);
    CREATE INDEX ix_proc_approvals_type ON procurement_approvals(approval_type);
    CREATE INDEX ix_proc_approvals_status ON procurement_approvals(status);
    CREATE INDEX ix_proc_approvals_approver ON procurement_approvals(approver_id);
    """)

    # 5. Create contracts table
    op.execute("""
    CREATE TABLE contracts (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        contract_code VARCHAR(50) NOT NULL UNIQUE,
        procurement_id VARCHAR(36) NOT NULL REFERENCES procurement_records(id) ON DELETE RESTRICT,
        startup_id VARCHAR(36) NOT NULL REFERENCES startups(id) ON DELETE RESTRICT,
        government_department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
        title VARCHAR(255) NOT NULL,
        contract_type VARCHAR(50) DEFAULT 'SERVICE' NOT NULL,
        contract_value NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        description TEXT,
        scope TEXT NOT NULL,
        terms_summary TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        executed_at TIMESTAMP WITH TIME ZONE,
        terminated_at TIMESTAMP WITH TIME ZONE,
        termination_reason TEXT,
        suspension_reason TEXT
    );
    CREATE INDEX ix_contracts_code ON contracts(contract_code);
    CREATE INDEX ix_contracts_procurement ON contracts(procurement_id);
    CREATE INDEX ix_contracts_startup ON contracts(startup_id);
    CREATE INDEX ix_contracts_dept ON contracts(government_department_id);
    CREATE INDEX ix_contracts_status ON contracts(status);
    CREATE INDEX ix_contracts_dates ON contracts(start_date, end_date);
    """)

    # 6. Create contract_milestones table
    op.execute("""
    CREATE TABLE contract_milestones (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        milestone_code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sequence_number INTEGER DEFAULT 1 NOT NULL,
        due_date DATE NOT NULL,
        amount NUMERIC(14, 2) NOT NULL,
        percentage NUMERIC(5, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'NOT_STARTED' NOT NULL,
        acceptance_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        rejection_reason TEXT,
        deliverable_requirements TEXT,
        completed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX ix_contract_milestones_contract ON contract_milestones(contract_id);
    CREATE INDEX ix_contract_milestones_status ON contract_milestones(status);
    CREATE INDEX ix_contract_milestones_due_date ON contract_milestones(due_date);
    CREATE INDEX ix_contract_milestones_sequence ON contract_milestones(contract_id, sequence_number);
    """)

    # 7. Create payment_tranches table
    op.execute("""
    CREATE TABLE payment_tranches (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        milestone_id VARCHAR(36) NOT NULL REFERENCES contract_milestones(id) ON DELETE CASCADE,
        tranche_code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        amount NUMERIC(14, 2) NOT NULL,
        percentage NUMERIC(5, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'SCHEDULED' NOT NULL,
        hold_reason TEXT
    );
    CREATE INDEX ix_payment_tranches_contract ON payment_tranches(contract_id);
    CREATE INDEX ix_payment_tranches_milestone ON payment_tranches(milestone_id);
    CREATE INDEX ix_payment_tranches_status ON payment_tranches(status);
    CREATE INDEX ix_payment_tranches_code ON payment_tranches(tranche_code);
    """)

    # 8. Create invoices table
    op.execute("""
    CREATE TABLE invoices (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
        milestone_id VARCHAR(36) NOT NULL REFERENCES contract_milestones(id) ON DELETE RESTRICT,
        payment_tranche_id VARCHAR(36) NOT NULL REFERENCES payment_tranches(id) ON DELETE RESTRICT,
        startup_id VARCHAR(36) NOT NULL REFERENCES startups(id) ON DELETE RESTRICT,
        amount NUMERIC(14, 2) NOT NULL,
        tax_amount NUMERIC(14, 2) DEFAULT 0.0 NOT NULL,
        total_amount NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE,
        description TEXT,
        invoice_file VARCHAR(500),
        file_storage_key VARCHAR(255),
        file_size_bytes INTEGER,
        status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        submitted_at TIMESTAMP WITH TIME ZONE,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_at TIMESTAMP WITH TIME ZONE,
        review_comments TEXT,
        rejection_reason TEXT
    );
    CREATE INDEX ix_invoices_number ON invoices(invoice_number);
    CREATE INDEX ix_invoices_contract ON invoices(contract_id);
    CREATE INDEX ix_invoices_milestone ON invoices(milestone_id);
    CREATE INDEX ix_invoices_tranche ON invoices(payment_tranche_id);
    CREATE INDEX ix_invoices_startup ON invoices(startup_id);
    CREATE INDEX ix_invoices_status ON invoices(status);
    CREATE INDEX ix_invoices_due_date ON invoices(due_date);
    """)

    # 9. Create procurement_documents table
    op.execute("""
    CREATE TABLE procurement_documents (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        procurement_id VARCHAR(36) REFERENCES procurement_records(id) ON DELETE CASCADE,
        contract_id VARCHAR(36) REFERENCES contracts(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE INDEX ix_proc_docs_proc ON procurement_documents(procurement_id);
    CREATE INDEX ix_proc_docs_contract ON procurement_documents(contract_id);
    CREATE INDEX ix_proc_docs_type ON procurement_documents(document_type);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS procurement_documents CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS payment_tranches CASCADE;
    DROP TABLE IF EXISTS contract_milestones CASCADE;
    DROP TABLE IF EXISTS contracts CASCADE;
    DROP TABLE IF EXISTS procurement_approvals CASCADE;
    DROP TABLE IF EXISTS procurement_records CASCADE;
    DROP TABLE IF EXISTS procurement_decisions CASCADE;
    DROP TABLE IF EXISTS procurement_pathways CASCADE;
    """)
