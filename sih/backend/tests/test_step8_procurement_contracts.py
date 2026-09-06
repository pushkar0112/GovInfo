import io
import uuid
import pytest
from datetime import date, datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.challenge import Challenge
from app.models.application import Application
from app.models.pilot import Pilot, PilotStatus, PilotSuccessStatus
from app.models.validation_workflow import (
    ValidationReport,
    ValidationAssessment,
    ValidationConfidence,
)
from app.models.procurement import (
    ProcurementPathway,
    ProcurementPathwayType,
    ProcurementDecision,
    ProcurementDecisionType,
    PilotValidationAssessment,
    ProcurementRecord,
    ProcurementStatus,
    ProcurementApproval,
    ApprovalStatus,
    Contract,
    ContractStatus,
    ContractMilestone,
    ContractMilestoneStatus,
    PaymentTranche,
    TrancheStatus,
    Invoice,
    InvoiceStatus,
    ProcurementDocument,
)
from app.models.audit_log import AuditLog
from app.core.security import UserRole, hash_password, create_access_token
from app.services.procurement_calculation_service import ProcurementCalculationService
from app.services.procurement_contract_service import ProcurementContractService

client = TestClient(app)


def make_auth_header(user_id: str, role) -> dict:
    role_str = role.value if hasattr(role, "value") else str(role)
    token = create_access_token({"sub": str(user_id), "role": role_str})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def step8_fixture():
    db = SessionLocal()
    u = uuid.uuid4().hex[:6]

    # Department
    dept = Department(
        name=f"Ministry of Electronics & IT {u}",
        code=f"MEITY_{u}",
        ministry="Ministry of Electronics and Information Technology",
        contact_email=f"proc_{u}@meity.gov.in",
        description="Public tech procurement testbed",
    )
    db.add(dept)
    db.flush()

    # Government User (Initiator)
    gov_initiator = User(
        email=f"gov_officer_{u}@gov.in",
        password_hash=hash_password("GovPass123!"),
        full_name="Rajesh Sharma (Initiating Officer)",
        role=UserRole.GOVERNMENT,
        department_id=dept.id,
        is_active=True,
    )
    db.add(gov_initiator)

    # Secondary Government User (for multi-tier approval)
    gov_approver = User(
        email=f"gov_director_{u}@gov.in",
        password_hash=hash_password("GovPass123!"),
        full_name="Sunita Rao (Joint Secretary Approver)",
        role=UserRole.GOVERNMENT,
        department_id=dept.id,
        is_active=True,
    )
    db.add(gov_approver)

    # Procurement Officer User
    proc_officer = User(
        email=f"proc_officer_{u}@gem.gov.in",
        password_hash=hash_password("ProcPass123!"),
        full_name="Anil Verma (Procurement Sanction Authority)",
        role=UserRole.PROCUREMENT_OFFICER,
        organization_name="GeM / Finance Sanction Cell",
        is_active=True,
    )
    db.add(proc_officer)

    # Admin User
    admin_user = User(
        email=f"admin_{u}@govinnovate.in",
        password_hash=hash_password("AdminPass123!"),
        full_name="Platform Super Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin_user)

    # Startup User & Entity
    startup_user = User(
        email=f"founder_{u}@technext.io",
        password_hash=hash_password("StartupPass123!"),
        full_name="Vikram Mehta",
        role=UserRole.STARTUP,
        is_active=True,
    )
    db.add(startup_user)
    db.flush()

    startup = Startup(
        user_id=startup_user.id,
        company_name=f"TechNext Solutions {u}",
        headquarters="Delhi",
        dpiit_recognized=True,
        dpiit_number=f"DPIIT-{u}",
    )
    db.add(startup)
    db.flush()

    # Challenge
    challenge = Challenge(
        challenge_code=f"CH-{u}",
        title=f"AI Civic Analytics Pipeline {u}",
        department_id=dept.id,
        created_by=gov_initiator.id,
        problem_statement="Shortage of automated civic analytics.",
        desired_outcome="Real-time traffic and civic telemetry.",
        domain="CivicTech",
        status="ACTIVE",
    )
    db.add(challenge)
    db.flush()

    # Application
    application = Application(
        application_code=f"APP-{u}",
        challenge_id=challenge.id,
        startup_id=startup.id,
        submitted_by=startup_user.id,
        status="SELECTED_FOR_PILOT",
        proposal_title=f"Civic AI Engine Proposal {u}",
    )
    db.add(application)
    db.flush()

    # Pilot: Successfully validated
    pilot_successful = Pilot(
        pilot_code=f"PILOT-SUCC-{u}",
        title=f"Civic AI Sandbox Validation {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept.id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.SUCCESSFUL,
        classification_confirmed_at=datetime.now(timezone.utc),
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=450000.0,
    )
    db.add(pilot_successful)

    # Pilot: Incomplete (In Progress)
    pilot_in_progress = Pilot(
        pilot_code=f"PILOT-PROG-{u}",
        title=f"Unfinished Pilot {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept.id,
        status=PilotStatus.ACTIVE,
        success_status=PilotSuccessStatus.NOT_ASSESSED,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 6, 30),
        pilot_budget=450000.0,
    )
    db.add(pilot_in_progress)

    # Pilot: Completed but Unsuccessful
    pilot_unsuccessful = Pilot(
        pilot_code=f"PILOT-FAIL-{u}",
        title=f"Failed Solution Pilot {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept.id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.UNSUCCESSFUL,
        classification_confirmed_at=datetime.now(timezone.utc),
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=450000.0,
    )
    db.add(pilot_unsuccessful)

    # Pilot: Completed but NOT confirmed
    pilot_unconfirmed = Pilot(
        pilot_code=f"PILOT-UNCONF-{u}",
        title=f"Unconfirmed Pilot {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept.id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.NOT_ASSESSED,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=450000.0,
    )
    db.add(pilot_unconfirmed)

    # Standard Pathway
    pathway = db.query(ProcurementPathway).filter(ProcurementPathway.code == "DIRECT_GEM_L1").first()
    if not pathway:
        pathway = ProcurementPathway(
            code="DIRECT_GEM_L1",
            name="GeM Direct Purchase (Under Threshold)",
            description="GeM Direct Purchase allowed up to ₹5,00,000 as per statutory limits under GFR Rule 149 (i).",
            authority_level="HEAD_OF_DEPARTMENT",
            requires_competitive_process=False,
            requires_financial_approval=True,
            requires_legal_review=False,
            active=True,
        )
        db.add(pathway)

    db.commit()

    return {
        "db": db,
        "u": u,
        "dept": dept,
        "gov_initiator": gov_initiator,
        "gov_approver": gov_approver,
        "proc_officer": proc_officer,
        "admin_user": admin_user,
        "startup_user": startup_user,
        "startup": startup,
        "challenge": challenge,
        "application": application,
        "pilot_successful": pilot_successful,
        "pilot_in_progress": pilot_in_progress,
        "pilot_unsuccessful": pilot_unsuccessful,
        "pilot_unconfirmed": pilot_unconfirmed,
        "pathway": pathway,
    }


# ==============================================================================
# SECTION 1: ELIGIBILITY GATING & DIVERGENCE AUDIT (TESTS 1 - 8)
# ==============================================================================

def test_01_pilot_not_completed_cannot_initiate_procurement(step8_fixture):
    """1. Incomplete pilot cannot initiate procurement."""
    f = step8_fixture
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{f['pilot_in_progress'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Attempting early procurement progression without completion.",
        },
    )
    assert res.status_code == 400
    assert "must be COMPLETED" in res.json()["detail"]


def test_02_validation_not_confirmed_cannot_initiate_procurement(step8_fixture):
    """2. Pilot without confirmed success status cannot initiate procurement."""
    f = step8_fixture
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{f['pilot_unconfirmed'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Attempting procurement before validation confirmation.",
        },
    )
    assert res.status_code == 400
    assert "validation outcome has not been officially classified" in res.json()["detail"]


def test_03_unsuccessful_pilot_blocks_normal_procurement(step8_fixture):
    """3. Unsuccessful pilot is blocked from standard PROCEED_TO_PROCUREMENT."""
    f = step8_fixture
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{f['pilot_unsuccessful'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Overriding failed pilot into procurement.",
        },
    )
    assert res.status_code == 400
    assert "does not currently support standard procurement progression" in res.json()["detail"]


def test_04_successful_pilot_allows_procurement_decision(step8_fixture):
    """4. Successful pilot allows PROCEED_TO_PROCUREMENT."""
    f = step8_fixture
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{f['pilot_successful'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "All KPI thresholds met. Transitioning to GeM procurement.",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["decision_code"].startswith("PDEC-")
    assert data["decision_type"] == "PROCEED_TO_PROCUREMENT"
    assert data["pilot_validation_assessment"] == "SUCCESSFUL"


def test_05_partially_successful_pilot_allows_procurement_decision(step8_fixture):
    """5. Partially successful pilot allows procurement with conditional scope."""
    f = step8_fixture
    db = f["db"]
    u = uuid.uuid4().hex[:6]

    pilot_part = Pilot(
        pilot_code=f"PILOT-PART-{u}",
        title=f"Partial Success Pilot {u}",
        challenge_id=f["challenge"].id,
        application_id=f["application"].id,
        startup_id=f["startup"].id,
        government_department_id=f["dept"].id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.PARTIALLY_SUCCESSFUL,
        classification_confirmed_at=datetime.now(timezone.utc),
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=450000.0,
    )
    db.add(pilot_part)
    db.commit()

    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{pilot_part.id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Core KPIs validated, proceeding with reduced scope.",
            "conditional_scope": "Phase 1 telemetry only",
        },
    )
    assert res.status_code == 201
    assert res.json()["decision_type"] == "PROCEED_TO_PROCUREMENT"


def test_06_non_procurement_decision_for_unsuccessful_pilot(step8_fixture):
    """6. Unsuccessful pilot permits non-procurement decisions (e.g. DO_NOT_PROCEED, RE_PILOT)."""
    f = step8_fixture
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{f['pilot_unsuccessful'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "DO_NOT_PROCEED",
            "justification": "Validation KPIs failed. Pilot closed without procurement.",
        },
    )
    assert res.status_code == 201
    assert res.json()["decision_type"] == "DO_NOT_PROCEED"


def test_07_divergence_justification_required_when_diverging(step8_fixture):
    """7. Divergence justification (min 15 chars) is enforced when decision contradicts validation."""
    f = step8_fixture
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/pilots/{f['pilot_successful'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "DO_NOT_PROCEED",
            "justification": "Closing down.",
            # Missing divergence justification
        },
    )
    assert res.status_code == 400
    assert "Divergence from pilot validation assessment requires a detailed justification" in res.json()["detail"]


def test_08_procurement_decision_creates_audit_log(step8_fixture):
    """8. Decision creation generates an immutable audit log entry."""
    f = step8_fixture
    db = f["db"]
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)

    client.post(
        f"/api/v1/government/pilots/{f['pilot_successful'].id}/procurement/decisions",
        headers=headers,
        json={
            "decision_type": "FURTHER_REVIEW",
            "justification": "Re-evaluating budgetary constraints before final procurement.",
            "divergence_justification": "Validating multi-year fiscal capacity across department divisions.",
        },
    )

    log = db.query(AuditLog).filter(
        AuditLog.action == "PROCUREMENT_DECISION_RECORDED"
    ).order_by(AuditLog.created_at.desc()).first()
    assert log is not None
    assert str(f["pilot_successful"].id) in log.details


# ==============================================================================
# SECTION 2: PATHWAY SELECTION, LEGAL CAVEAT & MULTI-TIER APPROVALS (TESTS 9 - 15)
# ==============================================================================

def test_09_pathway_selection_requires_statutory_acknowledgement(step8_fixture):
    """9. Pathway selection blocks without mandatory statutory rule acknowledgement."""
    f = step8_fixture
    # Create valid decision first
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "KPI passed, moving to pathway selection.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )

    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        "/api/v1/government/procurement/records",
        headers=headers,
        json={
            "decision_id": str(dec.id),
            "pathway_code": f["pathway"].code,
            "estimated_value": 450000.0,
            "statutory_rules_acknowledged": False,  # Missing acknowledgement
        },
    )
    assert res.status_code == 400
    assert "acknowledgement of statutory procurement rules is required" in res.json()["detail"]


def test_10_pathway_warning_and_legal_caveat_returned(step8_fixture):
    """10. Value exceeding pathway threshold triggers warning, legal caveat is returned."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Proceeding with high-value order.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )

    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        "/api/v1/government/procurement/records",
        headers=headers,
        json={
            "decision_id": str(dec.id),
            "pathway_code": f["pathway"].code,
            "estimated_value": 750000.0,  # Exceeds 500,000 threshold
            "statutory_rules_acknowledged": True,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["pathway_warning"] is not None
    assert "exceeds pathway ceiling" in data["pathway_warning"]
    assert "Workflow label only" in data["statutory_rules_caveat"]


def test_11_multi_tier_approvals_generated_correctly(step8_fixture):
    """11. Procurement record automatically spawns multi-tier approvals."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Proceeding to multi-tier approval generation.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )

    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        "/api/v1/government/procurement/records",
        headers=headers,
        json={
            "decision_id": str(dec.id),
            "pathway_code": f["pathway"].code,
            "estimated_value": 350000.0,
            "statutory_rules_acknowledged": True,
        },
    )
    assert res.status_code == 201
    record_id = res.json()["id"]

    # Check approvals
    approvals_res = client.get(f"/api/v1/government/procurement/{record_id}", headers=headers)
    assert approvals_res.status_code == 200
    approvals = approvals_res.json()["approvals"]
    assert len(approvals) == 2
    assert approvals[0]["approval_tier"] == 1
    assert approvals[1]["approval_tier"] == 2


def test_12_initiator_cannot_self_approve(step8_fixture):
    """12. Initiating officer is prohibited from approving their own procurement action."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Testing anti-self-approval gate.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )
    rec = svc.create_procurement_record(
        decision_id=dec.id,
        user=f["gov_initiator"],
        record_data=type("Obj", (), {
            "pathway_code": f["pathway"].code,
            "estimated_value": 300000.0,
            "currency": "INR",
            "pac_certificate_number": None,
            "pac_justification": None,
            "statutory_rules_acknowledged": True,
        })()
    )

    tier1_appr = [a for a in rec.approvals if a.approval_tier == 1][0]
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/approvals/{tier1_appr.id}",
        headers=headers,
        json={"status": "APPROVED", "comments": "Self-approving my own request."},
    )
    assert res.status_code == 400
    assert "Initiating officer cannot approve their own procurement action" in res.json()["detail"]


def test_13_approvals_must_proceed_in_tier_sequence(step8_fixture):
    """13. Tier 2 approval cannot be executed while Tier 1 is still pending."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Testing tier sequence.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )
    rec = svc.create_procurement_record(
        decision_id=dec.id,
        user=f["gov_initiator"],
        record_data=type("Obj", (), {
            "pathway_code": f["pathway"].code,
            "estimated_value": 300000.0,
            "currency": "INR",
            "pac_certificate_number": None,
            "pac_justification": None,
            "statutory_rules_acknowledged": True,
        })()
    )

    tier2_appr = [a for a in rec.approvals if a.approval_tier == 2][0]
    headers = make_auth_header(f["proc_officer"].id, UserRole.PROCUREMENT_OFFICER)
    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/approvals/{tier2_appr.id}",
        headers=headers,
        json={"status": "APPROVED", "comments": "Skipping tier 1 straight to tier 2."},
    )
    assert res.status_code == 400
    assert "must be approved before" in res.json()["detail"]


def test_14_rejection_at_any_tier_stops_workflow(step8_fixture):
    """14. Rejection at any tier halts procurement and transitions record to REJECTED."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Testing rejection flow.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )
    rec = svc.create_procurement_record(
        decision_id=dec.id,
        user=f["gov_initiator"],
        record_data=type("Obj", (), {
            "pathway_code": f["pathway"].code,
            "estimated_value": 300000.0,
            "currency": "INR",
            "pac_certificate_number": None,
            "pac_justification": None,
            "statutory_rules_acknowledged": True,
        })()
    )

    tier1_appr = [a for a in rec.approvals if a.approval_tier == 1][0]
    headers = make_auth_header(f["gov_approver"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/approvals/{tier1_appr.id}",
        headers=headers,
        json={"status": "REJECTED", "comments": "Budget line item not sanctioned for this FY."},
    )
    assert res.status_code == 200

    # Verify record is REJECTED
    rec_check = client.get(f"/api/v1/government/procurement/{rec.id}", headers=headers).json()
    assert rec_check["status"] == "REJECTED"


def test_15_contract_cannot_be_created_before_all_approvals(step8_fixture):
    """15. Contract creation blocked if any approval tier is pending or rejected."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Testing contract gate before approvals.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )
    rec = svc.create_procurement_record(
        decision_id=dec.id,
        user=f["gov_initiator"],
        record_data=type("Obj", (), {
            "pathway_code": f["pathway"].code,
            "estimated_value": 300000.0,
            "currency": "INR",
            "pac_certificate_number": None,
            "pac_justification": None,
            "statutory_rules_acknowledged": True,
        })()
    )

    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/contracts",
        headers=headers,
        json={
            "title": "Unauthorized Contract",
            "contract_value": 300000.0,
            "start_date": "2026-04-01",
            "end_date": "2026-10-01",
            "milestones": [
                {"sequence_order": 1, "title": "M1", "percentage": 100.0, "allocated_amount": 300000.0}
            ],
        },
    )
    assert res.status_code == 400
    assert "must be fully APPROVED" in res.json()["detail"]


# ==============================================================================
# SECTION 3: CONTRACTS, 100% MILESTONES & TRANCHE DECOUPLING (TESTS 16 - 22)
# ==============================================================================

@pytest.fixture
def fully_approved_record(step8_fixture):
    """Helper fixture yielding a fully approved procurement record."""
    f = step8_fixture
    svc = ProcurementContractService(f["db"])
    dec = svc.create_procurement_decision(
        pilot_id=f["pilot_successful"].id,
        user=f["gov_initiator"],
        decision_data=type("Obj", (), {
            "decision_type": "PROCEED_TO_PROCUREMENT",
            "justification": "Approved for contract creation tests.",
            "divergence_justification": None,
            "conditional_scope": None,
        })()
    )
    rec = svc.create_procurement_record(
        decision_id=dec.id,
        user=f["gov_initiator"],
        record_data=type("Obj", (), {
            "pathway_code": f["pathway"].code,
            "estimated_value": 400000.0,
            "currency": "INR",
            "pac_certificate_number": None,
            "pac_justification": None,
            "statutory_rules_acknowledged": True,
        })()
    )

    # Approve Tier 1
    t1 = [a for a in rec.approvals if a.approval_tier == 1][0]
    svc.review_procurement_approval(
        procurement_record_id=rec.id,
        approval_id=t1.id,
        user=f["gov_approver"],
        review_data=type("Obj", (), {"status": "APPROVED", "comments": "Tier 1 clearance."})()
    )

    # Approve Tier 2
    t2 = [a for a in rec.approvals if a.approval_tier == 2][0]
    svc.review_procurement_approval(
        procurement_record_id=rec.id,
        approval_id=t2.id,
        user=f["proc_officer"],
        review_data=type("Obj", (), {"status": "APPROVED", "comments": "Tier 2 clearance."})()
    )

    return rec


def test_16_contract_milestones_percentage_must_equal_100(step8_fixture, fully_approved_record):
    """16. Milestone percentage sum must equal exactly 100%."""
    f = step8_fixture
    rec = fully_approved_record
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)

    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/contracts",
        headers=headers,
        json={
            "title": "Invalid Percentage Contract",
            "contract_value": 400000.0,
            "start_date": "2026-04-01",
            "end_date": "2026-10-01",
            "milestones": [
                {"sequence_order": 1, "title": "Phase 1", "percentage": 40.0, "allocated_amount": 160000.0},
                {"sequence_order": 2, "title": "Phase 2", "percentage": 50.0, "allocated_amount": 200000.0},
                # Total = 90% (Invalid)
            ],
        },
    )
    assert res.status_code == 400
    assert "must sum to 100%" in res.json()["detail"]


def test_17_contract_milestones_amount_must_match_contract_value(step8_fixture, fully_approved_record):
    """17. Milestone amounts sum must match contract value."""
    f = step8_fixture
    rec = fully_approved_record
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)

    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/contracts",
        headers=headers,
        json={
            "title": "Mismatched Amount Contract",
            "contract_value": 400000.0,
            "start_date": "2026-04-01",
            "end_date": "2026-10-01",
            "milestones": [
                {"sequence_order": 1, "title": "M1", "percentage": 50.0, "allocated_amount": 200000.0},
                {"sequence_order": 2, "title": "M2", "percentage": 50.0, "allocated_amount": 150000.0},
                # Total = 350,000 != 400,000
            ],
        },
    )
    assert res.status_code == 400
    assert "must equal contract value" in res.json()["detail"]


def test_18_contract_activation_creates_decoupled_payment_tranches(step8_fixture, fully_approved_record):
    """18. Creating a contract automatically establishes 1:1 decoupled payment tranches."""
    f = step8_fixture
    rec = fully_approved_record
    headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)

    res = client.post(
        f"/api/v1/government/procurement/{rec.id}/contracts",
        headers=headers,
        json={
            "title": "National Scale Telemetry Contract",
            "contract_value": 400000.0,
            "start_date": "2026-04-01",
            "end_date": "2026-10-01",
            "milestones": [
                {"sequence_order": 1, "title": "Milestone Alpha", "percentage": 30.0, "allocated_amount": 120000.0},
                {"sequence_order": 2, "title": "Milestone Beta", "percentage": 70.0, "allocated_amount": 280000.0},
            ],
        },
    )
    assert res.status_code == 201
    contract_data = res.json()
    assert len(contract_data["milestones"]) == 2
    assert len(contract_data["tranches"]) == 2
    assert contract_data["tranches"][0]["tranche_code"].startswith("TRN-")


def test_19_tranches_initial_status_is_locked(step8_fixture, fully_approved_record):
    """19. Tranches must initialize in LOCKED status."""
    f = step8_fixture
    rec = fully_approved_record
    svc = ProcurementContractService(f["db"])
    contract = svc.create_contract_from_procurement(
        procurement_record_id=rec.id,
        user=f["gov_initiator"],
        contract_data=type("Obj", (), {
            "title": "Locked Tranches Verification",
            "contract_value": 400000.0,
            "currency": "INR",
            "payment_terms": "Milestone-Linked",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 10, 1),
            "milestones": [
                type("Obj", (), {"sequence_order": 1, "title": "M1", "description": "D1", "percentage": 100.0, "allocated_amount": 400000.0, "due_date": None})()
            ],
        })()
    )

    tranche = contract.tranches[0]
    assert tranche.status == TrancheStatus.LOCKED


def test_20_milestone_completion_report_submission_by_startup(step8_fixture, fully_approved_record):
    """20. Startup submits milestone completion report, transitioning milestone to SUBMITTED."""
    f = step8_fixture
    rec = fully_approved_record
    svc = ProcurementContractService(f["db"])
    contract = svc.create_contract_from_procurement(
        procurement_record_id=rec.id,
        user=f["gov_initiator"],
        contract_data=type("Obj", (), {
            "title": "Startup Milestone Submission Test",
            "contract_value": 400000.0,
            "currency": "INR",
            "payment_terms": "Milestone-Linked",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 10, 1),
            "milestones": [
                type("Obj", (), {"sequence_order": 1, "title": "Telemetry Integration", "description": "Delivered", "percentage": 100.0, "allocated_amount": 400000.0, "due_date": None})()
            ],
        })()
    )

    milestone = contract.milestones[0]
    startup_headers = make_auth_header(f["startup_user"].id, UserRole.STARTUP)

    res = client.post(
        f"/api/v1/startup/contracts/{contract.id}/milestones/{milestone.id}/submit",
        headers=startup_headers,
        json={
            "completion_percentage": 100.0,
            "submission_notes": "All server endpoints provisioned and certified by STQC.",
            "deliverable_proof_url": "https://drive.google.com/stqc-cert.pdf",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUBMITTED"
    assert data["completion_percentage"] == 100.0


def test_21_milestone_acceptance_marks_linked_tranche_eligible_not_paid(step8_fixture, fully_approved_record):
    """21. Accepting milestone marks tranche as ELIGIBLE, NEVER automatically PAID."""
    f = step8_fixture
    rec = fully_approved_record
    svc = ProcurementContractService(f["db"])
    contract = svc.create_contract_from_procurement(
        procurement_record_id=rec.id,
        user=f["gov_initiator"],
        contract_data=type("Obj", (), {
            "title": "Decoupled Milestone Acceptance",
            "contract_value": 400000.0,
            "currency": "INR",
            "payment_terms": "Milestone-Linked",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 10, 1),
            "milestones": [
                type("Obj", (), {"sequence_order": 1, "title": "Deliverable 1", "description": "D1", "percentage": 100.0, "allocated_amount": 400000.0, "due_date": None})()
            ],
        })()
    )

    milestone = contract.milestones[0]
    tranche = contract.tranches[0]

    gov_headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/contracts/{contract.id}/milestones/{milestone.id}/review",
        headers=gov_headers,
        json={
            "status": "ACCEPTED",
            "acceptance_notes": "All deliverables inspected and accepted.",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ACCEPTED"

    # Verify tranche is ELIGIBLE, NOT PAID
    f["db"].refresh(tranche)
    assert tranche.status == TrancheStatus.ELIGIBLE
    assert tranche.status != TrancheStatus.PAID


def test_22_milestone_rejection_keeps_tranche_locked(step8_fixture, fully_approved_record):
    """22. Rejecting milestone keeps tranche in LOCKED status."""
    f = step8_fixture
    rec = fully_approved_record
    svc = ProcurementContractService(f["db"])
    contract = svc.create_contract_from_procurement(
        procurement_record_id=rec.id,
        user=f["gov_initiator"],
        contract_data=type("Obj", (), {
            "title": "Milestone Rejection Check",
            "contract_value": 400000.0,
            "currency": "INR",
            "payment_terms": "Milestone-Linked",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 10, 1),
            "milestones": [
                type("Obj", (), {"sequence_order": 1, "title": "Substandard deliverable", "description": "D1", "percentage": 100.0, "allocated_amount": 400000.0, "due_date": None})()
            ],
        })()
    )

    milestone = contract.milestones[0]
    tranche = contract.tranches[0]

    gov_headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    client.post(
        f"/api/v1/contracts/{contract.id}/milestones/{milestone.id}/review",
        headers=gov_headers,
        json={
            "status": "REJECTED",
            "acceptance_notes": "Deliverables do not match contract requirements.",
        },
    )

    f["db"].refresh(tranche)
    assert tranche.status == TrancheStatus.LOCKED


# ==============================================================================
# SECTION 4: INVOICES & PAYMENT WORKFLOW (TESTS 23 - 28)
# ==============================================================================

@pytest.fixture
def eligible_tranche_setup(step8_fixture, fully_approved_record):
    """Fixture returning an activated contract with an ELIGIBLE tranche."""
    f = step8_fixture
    rec = fully_approved_record
    svc = ProcurementContractService(f["db"])
    contract = svc.create_contract_from_procurement(
        procurement_record_id=rec.id,
        user=f["gov_initiator"],
        contract_data=type("Obj", (), {
            "title": "Invoice and Disbursement Sandbox",
            "contract_value": 200000.0,
            "currency": "INR",
            "payment_terms": "Milestone-Linked",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 10, 1),
            "milestones": [
                type("Obj", (), {"sequence_order": 1, "title": "Complete Service Pack", "description": "All", "percentage": 100.0, "allocated_amount": 200000.0, "due_date": None})()
            ],
        })()
    )

    # Accept milestone to make tranche ELIGIBLE
    milestone = contract.milestones[0]
    svc.review_contract_milestone(
        contract_id=contract.id,
        milestone_id=milestone.id,
        user=f["gov_initiator"],
        review_data=type("Obj", (), {"status": "ACCEPTED", "acceptance_notes": "Accepted."})()
    )

    return {"contract": contract, "tranche": contract.tranches[0]}


def test_23_invoice_cannot_be_submitted_for_locked_tranche(step8_fixture, fully_approved_record):
    """23. Startup cannot submit an invoice against a LOCKED tranche."""
    f = step8_fixture
    rec = fully_approved_record
    svc = ProcurementContractService(f["db"])
    contract = svc.create_contract_from_procurement(
        procurement_record_id=rec.id,
        user=f["gov_initiator"],
        contract_data=type("Obj", (), {
            "title": "Locked Invoicing Gate",
            "contract_value": 100000.0,
            "currency": "INR",
            "payment_terms": "Milestone-Linked",
            "start_date": date(2026, 4, 1),
            "end_date": date(2026, 10, 1),
            "milestones": [
                type("Obj", (), {"sequence_order": 1, "title": "Unfinished M1", "description": "D1", "percentage": 100.0, "allocated_amount": 100000.0, "due_date": None})()
            ],
        })()
    )

    locked_tranche = contract.tranches[0]
    startup_headers = make_auth_header(f["startup_user"].id, UserRole.STARTUP)

    res = client.post(
        "/api/v1/startup/invoices",
        headers=startup_headers,
        json={
            "tranche_id": str(locked_tranche.id),
            "invoice_number": f"INV-LOCKED-{f['u']}",
            "invoice_date": "2026-05-01",
            "basic_amount": 100000.0,
            "tax_amount": 18000.0,
        },
    )
    assert res.status_code == 400
    assert "is not currently ELIGIBLE for invoicing" in res.json()["detail"]


def test_24_invoice_submission_for_eligible_tranche(step8_fixture, eligible_tranche_setup):
    """24. Startup successfully submits tax invoice for an ELIGIBLE tranche."""
    f = step8_fixture
    tranche = eligible_tranche_setup["tranche"]
    startup_headers = make_auth_header(f["startup_user"].id, UserRole.STARTUP)

    res = client.post(
        "/api/v1/startup/invoices",
        headers=startup_headers,
        json={
            "tranche_id": str(tranche.id),
            "invoice_number": f"GST-INV-{f['u']}-01",
            "invoice_date": "2026-05-01",
            "basic_amount": 200000.0,
            "tax_amount": 36000.0,
            "notes": "HDFC Account: 5010023419",
            "invoice_file_url": "https://govinnovate.in/invoices/gst-inv.pdf",
        },
    )
    assert res.status_code == 201
    inv = res.json()
    assert inv["invoice_number"] == f"GST-INV-{f['u']}-01"
    assert inv["total_amount"] == 236000.0
    assert inv["status"] == "SUBMITTED"


def test_25_invoice_amount_cannot_exceed_tranche_amount(step8_fixture, eligible_tranche_setup):
    """25. Invoice basic amount cannot exceed tranche allocation."""
    f = step8_fixture
    tranche = eligible_tranche_setup["tranche"]
    startup_headers = make_auth_header(f["startup_user"].id, UserRole.STARTUP)

    res = client.post(
        "/api/v1/startup/invoices",
        headers=startup_headers,
        json={
            "tranche_id": str(tranche.id),
            "invoice_number": f"INV-EXCEED-{f['u']}",
            "invoice_date": "2026-05-01",
            "basic_amount": 250000.0,  # Exceeds 200,000
            "tax_amount": 45000.0,
        },
    )
    assert res.status_code == 400
    assert "exceeds tranche allocation" in res.json()["detail"]


def test_26_duplicate_invoice_guard_on_same_tranche(step8_fixture, eligible_tranche_setup):
    """26. Startup cannot submit a duplicate invoice for an active tranche."""
    f = step8_fixture
    tranche = eligible_tranche_setup["tranche"]
    startup_headers = make_auth_header(f["startup_user"].id, UserRole.STARTUP)

    # First invoice
    client.post(
        "/api/v1/startup/invoices",
        headers=startup_headers,
        json={
            "tranche_id": str(tranche.id),
            "invoice_number": f"INV-ORIG-{f['u']}",
            "invoice_date": "2026-05-01",
            "basic_amount": 200000.0,
            "tax_amount": 36000.0,
        },
    )

    # Second invoice on same tranche
    res = client.post(
        "/api/v1/startup/invoices",
        headers=startup_headers,
        json={
            "tranche_id": str(tranche.id),
            "invoice_number": f"INV-DUP-{f['u']}",
            "invoice_date": "2026-05-01",
            "basic_amount": 200000.0,
            "tax_amount": 36000.0,
        },
    )
    assert res.status_code == 400
    assert "already has an active invoice" in res.json()["detail"]


def test_27_government_reviews_and_approves_invoice(step8_fixture, eligible_tranche_setup):
    """27. Government officer reviews and approves submitted invoice."""
    f = step8_fixture
    tranche = eligible_tranche_setup["tranche"]
    startup_headers = make_auth_header(f["startup_user"].id, UserRole.STARTUP)

    inv_res = client.post(
        "/api/v1/startup/invoices",
        headers=startup_headers,
        json={
            "tranche_id": str(tranche.id),
            "invoice_number": f"INV-APPR-{f['u']}",
            "invoice_date": "2026-05-01",
            "basic_amount": 200000.0,
            "tax_amount": 36000.0,
        },
    )
    inv_id = inv_res.json()["id"]

    gov_headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/invoices/{inv_id}/review",
        headers=gov_headers,
        json={
            "status": "APPROVED",
            "review_comments": "GSTIN verified with GSTN portal. Passed for disbursement.",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"


def test_28_payment_recording_marks_tranche_paid(step8_fixture, eligible_tranche_setup):
    """28. Payment recording updates tranche to PAID and records transaction reference."""
    f = step8_fixture
    tranche = eligible_tranche_setup["tranche"]
    svc = ProcurementContractService(f["db"])

    # Submit and approve invoice
    inv = svc.submit_invoice(
        tranche_id=tranche.id,
        user=f["startup_user"],
        invoice_data=type("Obj", (), {
            "invoice_number": f"INV-PAY-{f['u']}",
            "invoice_date": date(2026, 5, 1),
            "basic_amount": 200000.0,
            "tax_amount": 36000.0,
            "invoice_file_url": None,
            "notes": None,
        })()
    )
    svc.review_invoice(
        invoice_id=inv.id,
        user=f["gov_initiator"],
        review_data=type("Obj", (), {"status": "APPROVED", "review_comments": "Verified."})()
    )

    gov_headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)
    res = client.post(
        f"/api/v1/government/tranches/{tranche.id}/pay",
        headers=gov_headers,
        json={
            "transaction_reference": f"PFMS-2026-TX-{f['u']}",
            "payment_mode": "PFMS",
            "paid_amount": 200000.0,
            "payment_date": "2026-05-05T10:00:00Z",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PAID"
    assert data["payment_reference"] == f"PFMS-2026-TX-{f['u']}"
    assert data["payment_mode"] == "PFMS"


# ==============================================================================
# SECTION 5: TRACEABILITY & OFFICER DASHBOARD (TESTS 29 - 30)
# ==============================================================================

def test_29_full_traceability_dossier_10_stages(step8_fixture, eligible_tranche_setup):
    """29. End-to-end 10-stage traceability dossier is constructed accurately."""
    f = step8_fixture
    contract = eligible_tranche_setup["contract"]
    gov_headers = make_auth_header(f["gov_initiator"].id, UserRole.GOVERNMENT)

    res = client.get(f"/api/v1/contracts/{contract.id}", headers=gov_headers)
    assert res.status_code == 200
    trace = res.json()["traceability"]

    # Verify all 10 stages exist
    assert trace["stage_1_challenge"] is not None
    assert trace["stage_2_startup_application"] is not None
    assert trace["stage_3_expert_evaluation"] is not None
    assert trace["stage_4_pilot_sandbox"] is not None
    assert trace["stage_5_validation_report"] is not None
    assert trace["stage_6_procurement_decision"] is not None
    assert trace["stage_7_pathway_selection"] is not None
    assert trace["stage_8_approval_records"] is not None
    assert trace["stage_9_contract_execution"] is not None
    assert trace["stage_10_milestone_payment_tranches"] is not None
    assert len(trace["stage_10_milestone_payment_tranches"]) >= 1


def test_30_procurement_officer_dashboard_metrics(step8_fixture):
    """30. Procurement officer dashboard delivers aggregated statutory metrics."""
    f = step8_fixture
    proc_headers = make_auth_header(f["proc_officer"].id, UserRole.PROCUREMENT_OFFICER)

    res = client.get("/api/v1/procurement-officer/dashboard", headers=proc_headers)
    assert res.status_code == 200
    data = res.json()
    assert "stats" in data
    assert "pending_approvals_count" in data["stats"]
    assert "active_contracts_count" in data["stats"]
    assert "total_contract_value" in data["stats"]
    assert "pending_invoices_count" in data["stats"]
    assert "disbursed_amount" in data["stats"]
    assert "recent_procurements" in data
    assert "recent_contracts" in data
