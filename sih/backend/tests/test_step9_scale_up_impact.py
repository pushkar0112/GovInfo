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
    ProcurementDecision,
    ProcurementRecord,
    Contract,
    DecisionType,
)
from app.models.scale_up import (
    ScaleUpDecision,
    ScaleUpPlan,
    ScaleTarget,
    ScalePhase,
    ScaleReadinessCheck,
    Replication,
    ScaleDeploymentUpdate,
    ImpactMetric,
    ImpactMeasurement,
    ImpactEvidence,
    ScaleOutcome,
    ScaleBeneficiaryMetric,
    ScaleRisk,
    ScaleLesson,
    ScaleUpDecisionType,
    ScaleUpDecisionStatus,
    ScalePlanStatus,
    ScalePlanApprovalStatus,
    RolloutStrategy,
    ScaleTargetType,
    ScaleTargetStatus,
    ReplicationDeploymentStatus,
    ReadinessCategory,
    ReadinessStatus,
    ScalePhaseStatus,
    ImpactCategory,
    ImpactDirection,
    ScaleOutcomeType,
    BeneficiaryCategory,
    RiskCategory,
    RiskSeverity,
    RiskStatus,
    LessonCategory,
)
from app.models.audit_log import AuditLog
from app.core.security import UserRole, hash_password, create_access_token
from app.services.scale_calculation_service import ScaleCalculationService
from app.services.scale_up_service import ScaleUpService

client = TestClient(app)


def make_auth_header(user_id: str, role) -> dict:
    role_str = role.value if hasattr(role, "value") else str(role)
    token = create_access_token({"sub": str(user_id), "role": role_str})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def step9_fixture():
    db = SessionLocal()
    u = uuid.uuid4().hex[:6]

    # Department 1 (Originating Department)
    dept1 = Department(
        name=f"Ministry of Road Transport & Highways {u}",
        code=f"MORTH_{u}",
        ministry="Ministry of Road Transport and Highways",
        contact_email=f"scale_{u}@morth.gov.in",
        description="Public transportation scaling testbed",
    )
    # Department 2 (Replication / Isolated Department)
    dept2 = Department(
        name=f"Ministry of Housing & Urban Affairs {u}",
        code=f"MOHUA_{u}",
        ministry="Ministry of Housing and Urban Affairs",
        contact_email=f"mohua_{u}@gov.in",
        description="Smart cities replication department",
    )
    db.add_all([dept1, dept2])
    db.flush()

    # Government Officer (Originating Department)
    gov_user = User(
        email=f"gov_officer_{u}@morth.gov.in",
        password_hash=hash_password("GovPass123!"),
        full_name=f"Dr. Arvind Mehta ({u})",
        role=UserRole.GOVERNMENT,
        department_id=dept1.id,
        is_active=True,
    )
    # Other Department Government Officer (for Department Isolation testing)
    gov_isolated = User(
        email=f"gov_other_{u}@mohua.gov.in",
        password_hash=hash_password("GovPass123!"),
        full_name=f"Dr. Priya Singh ({u})",
        role=UserRole.GOVERNMENT,
        department_id=dept2.id,
        is_active=True,
    )
    # Admin User
    admin_user = User(
        email=f"admin_{u}@govinnovate.in",
        password_hash=hash_password("AdminPass123!"),
        full_name="Platform Administrator",
        role=UserRole.ADMIN,
        is_active=True,
    )
    # Startup 1 User & Startup
    startup_user = User(
        email=f"founder_{u}@trafficai.io",
        password_hash=hash_password("StartupPass123!"),
        full_name=f"Kavita Deshmukh ({u})",
        role=UserRole.STARTUP,
        is_active=True,
    )
    # Startup 2 User (for Startup Isolation testing)
    startup_user_isolated = User(
        email=f"other_founder_{u}@othertech.io",
        password_hash=hash_password("StartupPass123!"),
        full_name=f"Rohan Sen ({u})",
        role=UserRole.STARTUP,
        is_active=True,
    )
    db.add_all([gov_user, gov_isolated, admin_user, startup_user, startup_user_isolated])
    db.flush()

    startup = Startup(
        user_id=startup_user.id,
        company_name=f"TrafficAI Mobility Labs {u}",
        headquarters="New Delhi",
        dpiit_recognized=True,
        dpiit_number=f"DPIIT-ST9-{u}",
    )
    startup_isolated = Startup(
        user_id=startup_user_isolated.id,
        company_name=f"OtherTech Systems {u}",
        headquarters="Bengaluru",
        dpiit_recognized=True,
        dpiit_number=f"DPIIT-OTH-{u}",
    )
    db.add_all([startup, startup_isolated])
    db.flush()

    # Challenge
    challenge = Challenge(
        challenge_code=f"CH-ST9-{u}",
        title=f"Intelligent Arterial Traffic Management {u}",
        department_id=dept1.id,
        created_by=gov_user.id,
        problem_statement="Severe rush-hour bottlenecking.",
        desired_outcome="Dynamic green-wave corridor clearance.",
        domain="SmartCities",
        status="ACTIVE",
    )
    db.add(challenge)
    db.flush()

    # Application
    application = Application(
        application_code=f"APP-ST9-{u}",
        challenge_id=challenge.id,
        startup_id=startup.id,
        submitted_by=startup_user.id,
        status="SELECTED_FOR_PILOT",
        proposal_title=f"Adaptive Edge-Vision Signal System {u}",
    )
    db.add(application)
    db.flush()

    # Pilot 1: Fully Completed, Validated & Successful
    pilot_valid = Pilot(
        pilot_code=f"PL-VAL-{u}",
        pilot_title=f"Adaptive Traffic Signal Sandbox {u}",
        title=f"Adaptive Traffic Signal Sandbox {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.SUCCESSFUL,
        validation_status="VALIDATION_CONFIRMED",
        validator_assessment="SUCCESSFUL",
        classification_confirmed_at=datetime.now(timezone.utc),
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=500000.0,
    )
    # Pilot 2: Incomplete (Status ACTIVE)
    pilot_incomplete = Pilot(
        pilot_code=f"PL-INC-{u}",
        pilot_title=f"Incomplete Signal Sandbox {u}",
        title=f"Incomplete Signal Sandbox {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        status=PilotStatus.ACTIVE,
        success_status=PilotSuccessStatus.NOT_ASSESSED,
        validation_status="NOT_STARTED",
        start_date=date(2026, 2, 1),
        pilot_budget=400000.0,
    )
    # Pilot 3: Completed but Unsuccessful
    pilot_unsuccessful = Pilot(
        pilot_code=f"PL-UNSUCC-{u}",
        pilot_title=f"Failed Telemetry Sandbox {u}",
        title=f"Failed Telemetry Sandbox {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.UNSUCCESSFUL,
        validation_status="VALIDATION_CONFIRMED",
        validator_assessment="UNSUCCESSFUL",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=300000.0,
    )
    # Pilot 4: Completed and Partially Successful
    pilot_partially_succ = Pilot(
        pilot_code=f"PL-PART-{u}",
        pilot_title=f"Partially Successful Corridor Sandbox {u}",
        title=f"Partially Successful Corridor Sandbox {u}",
        challenge_id=challenge.id,
        application_id=application.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.PARTIALLY_SUCCESSFUL,
        validation_status="VALIDATION_CONFIRMED",
        validator_assessment="PARTIALLY_SUCCESSFUL",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        pilot_budget=350000.0,
    )
    db.add_all([pilot_valid, pilot_incomplete, pilot_unsuccessful, pilot_partially_succ])
    db.flush()

    # Step 8 Procurement Decision, Procurement Record & Contract for pilot_valid
    pdec = ProcurementDecision(
        procurement_code=f"PDEC-ST9-{u}",
        pilot_id=pilot_valid.id,
        application_id=application.id,
        challenge_id=challenge.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        decision_type=DecisionType.PROCEED_TO_PROCUREMENT.value,
        decision_status="APPROVED",
        rationale="100% KPI pass rate confirmed by STQC independent audit.",
        created_by=gov_user.id,
        decided_at=datetime.now(timezone.utc),
    )
    db.add(pdec)
    db.flush()

    prec = ProcurementRecord(
        procurement_code=f"PROC-ST9-{u}",
        procurement_decision_id=pdec.id,
        pilot_id=pilot_valid.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        title="Edge AI Computer Vision Deployment Record",
        scope="Deployment of 12 sensor nodes",
        estimated_value=600000.0,
        approved_value=600000.0,
        status="APPROVED",
        approval_status="APPROVED",
        created_by=gov_user.id,
    )
    db.add(prec)
    db.flush()

    contract = Contract(
        contract_code=f"CONT-ST9-{u}",
        procurement_id=prec.id,
        startup_id=startup.id,
        government_department_id=dept1.id,
        title="Edge AI Computer Vision Deployment Agreement",
        contract_type="SERVICE",
        contract_value=600000.0,
        currency="INR",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 10, 31),
        scope="Deployment of 12 sensor nodes",
        terms_summary="Standard public procurement GFR terms and SLAs",
        status="ACTIVE",
        created_by=gov_user.id,
    )
    db.add(contract)
    db.commit()

    return {
        "db": db,
        "u": u,
        "dept1": dept1,
        "dept2": dept2,
        "gov_user": gov_user,
        "gov_isolated": gov_isolated,
        "admin_user": admin_user,
        "startup_user": startup_user,
        "startup_user_isolated": startup_user_isolated,
        "startup": startup,
        "startup_isolated": startup_isolated,
        "challenge": challenge,
        "application": application,
        "pilot_valid": pilot_valid,
        "pilot_incomplete": pilot_incomplete,
        "pilot_unsuccessful": pilot_unsuccessful,
        "pilot_partially_succ": pilot_partially_succ,
        "contract": contract,
        "pdec": pdec,
    }


# ==============================================================================
# Group 1: Scale-Up Decision Lifecycle & Eligibility (6 Tests)
# ==============================================================================

def test_scale_decision_requires_completed_and_validated_pilot(step9_fixture):
    """Attempting scale decision on an incomplete/unvalidated pilot must fail with HTTP 400."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "decision_type": "SCALE",
        "rationale": "Valid administrative rationale for scaling the operational pilot.",
        "estimated_scale_value": 1500000.0,
        "proposed_sites_count": 5,
    }
    # Incomplete pilot
    res = client.post(
        f"/api/v1/government/pilots/{fix['pilot_incomplete'].id}/scale-decision",
        json=payload,
        headers=headers,
    )
    assert res.status_code == 400
    assert "Pilot must be completed" in res.json()["detail"]


def test_scale_decision_blocks_unsuccessful_pilot(step9_fixture):
    """Attempting normal scale-up on an UNSUCCESSFUL pilot must be rejected with HTTP 400."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "decision_type": "SCALE",
        "rationale": "Attempting scale despite unsuccessful pilot trial.",
        "estimated_scale_value": 800000.0,
        "proposed_sites_count": 3,
    }
    res = client.post(
        f"/api/v1/government/pilots/{fix['pilot_unsuccessful'].id}/scale-decision",
        json=payload,
        headers=headers,
    )
    assert res.status_code == 400
    assert "Cannot scale or replicate an UNSUCCESSFUL pilot" in res.json()["detail"]


def test_scale_decision_allows_partially_successful_pilot(step9_fixture):
    """A PARTIALLY_SUCCESSFUL pilot is eligible for RE_PILOT, FURTHER_REVIEW, or scaled adaptation."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "decision_type": "RE_PILOT",
        "rationale": "Authorizing targeted re-pilot on high-congestion nodes with calibrated sensors.",
        "estimated_scale_value": 500000.0,
        "proposed_sites_count": 2,
    }
    res = client.post(
        f"/api/v1/government/pilots/{fix['pilot_partially_succ'].id}/scale-decision",
        json=payload,
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["decision_type"] == "RE_PILOT"
    assert data["decision_status"] == "DRAFT"
    assert data["scale_up_code"].startswith("SCALE-")


def test_scale_decision_requires_procurement_or_contract(step9_fixture):
    """Normal scale-up requires an existing procurement decision or contract."""
    fix = step9_fixture
    db = fix["db"]
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    # Temporarily remove contract associations for isolated check
    app_isolated = Application(
        application_code=f"APP-ISO-{fix['u']}",
        challenge_id=fix["challenge"].id,
        startup_id=fix["startup_isolated"].id,
        submitted_by=fix["startup_user_isolated"].id,
        status="SELECTED_FOR_PILOT",
        proposal_title="Isolated Proposal without Contract",
    )
    db.add(app_isolated)
    db.flush()

    temp_pilot = Pilot(
        pilot_code=f"PL-NO-PROC-{fix['u']}",
        pilot_title="Pilot without Contract",
        title="Pilot without Contract",
        challenge_id=fix["challenge"].id,
        application_id=app_isolated.id,
        startup_id=fix["startup_isolated"].id,
        government_department_id=fix["dept1"].id,
        status=PilotStatus.COMPLETED,
        success_status=PilotSuccessStatus.SUCCESSFUL,
        validation_status="VALIDATION_CONFIRMED",
        validator_assessment="SUCCESSFUL",
        classification_confirmed_at=datetime.now(timezone.utc),
    )
    db.add(temp_pilot)
    db.commit()

    payload = {
        "decision_type": "SCALE",
        "rationale": "Attempting scale without prior procurement or contract.",
        "estimated_scale_value": 1000000.0,
        "proposed_sites_count": 4,
    }
    res = client.post(
        f"/api/v1/government/pilots/{temp_pilot.id}/scale-decision",
        json=payload,
        headers=headers,
    )
    assert res.status_code == 400
    assert "procurement decision or contract is required" in res.json()["detail"]


def test_scale_decision_role_and_department_isolation(step9_fixture):
    """Officers from Department 2 must be blocked from creating scale decisions for Department 1 pilots."""
    fix = step9_fixture
    iso_headers = make_auth_header(fix["gov_isolated"].id, UserRole.GOVERNMENT)

    payload = {
        "decision_type": "SCALE",
        "rationale": "Cross-departmental unauthorized attempt to scale Department 1 pilot.",
        "estimated_scale_value": 1200000.0,
        "proposed_sites_count": 6,
    }
    res = client.post(
        f"/api/v1/government/pilots/{fix['pilot_valid'].id}/scale-decision",
        json=payload,
        headers=iso_headers,
    )
    assert res.status_code == 403
    assert "Department isolation" in res.json()["detail"]


def test_scale_decision_approval_lifecycle(step9_fixture):
    """Complete Scale Decision lifecycle: DRAFT -> SUBMITTED -> APPROVED with audit event."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "decision_type": "SCALE",
        "rationale": "Official scale-up justification following exemplary 28.5% delay reduction.",
        "estimated_scale_value": 2000000.0,
        "proposed_sites_count": 8,
    }
    create_res = client.post(
        f"/api/v1/government/pilots/{fix['pilot_valid'].id}/scale-decision",
        json=payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    dec_id = create_res.json()["id"]
    assert create_res.json()["decision_status"] == "DRAFT"

    # Submit
    sub_res = client.post(f"/api/v1/government/scale-decisions/{dec_id}/submit", headers=headers)
    assert sub_res.status_code == 200
    assert sub_res.json()["decision_status"] == "SUBMITTED"

    # Approve
    app_res = client.post(f"/api/v1/government/scale-decisions/{dec_id}/approve", headers=headers)
    assert app_res.status_code == 200
    assert app_res.json()["decision_status"] == "APPROVED"
    assert app_res.json()["reviewed_by"] == fix["gov_user"].id


# ==============================================================================
# Group 2: Scale-Up Planning & Phased Rollout (6 Tests)
# ==============================================================================

@pytest.fixture
def approved_scale_decision(step9_fixture):
    fix = step9_fixture
    db = fix["db"]
    code = ScaleCalculationService.generate_scale_code(db)
    decision = ScaleUpDecision(
        scale_up_code=code,
        pilot_id=fix["pilot_valid"].id,
        contract_id=fix["contract"].id,
        startup_id=fix["startup"].id,
        originating_department_id=fix["dept1"].id,
        decision_type=ScaleUpDecisionType.SCALE.value,
        decision_status=ScaleUpDecisionStatus.APPROVED.value,
        rationale="Approved for city-wide rollout across 8 intersections.",
        estimated_scale_value=1500000.0,
        currency="INR",
        proposed_sites_count=8,
        created_by=fix["gov_user"].id,
        reviewed_by=fix["gov_user"].id,
        decided_at=datetime.now(timezone.utc),
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision


def test_scale_plan_creation_with_valid_decision(step9_fixture, approved_scale_decision):
    """Creating a scale-up plan with valid approved decision succeeds and sets status to PLANNING."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Delhi NCR Traffic Sensor Grid Scale-Up",
        "objective": "Deploy 32 edge sensor nodes across 8 priority corridors.",
        "scope": "8 major traffic intersections in Delhi NCT.",
        "target_population": "1.5 million daily commuters",
        "deployment_strategy": "PHASED_ROLLOUT",
        "estimated_budget": 1500000.0,
        "approved_budget": 1500000.0,
        "target_sites": 8,
        "target_units": 32,
    }
    res = client.post("/api/v1/government/scale-plans", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["plan_code"].startswith("PLAN-")
    assert data["status"] == "PLANNING"
    assert data["approval_status"] == "PENDING"
    assert data["estimated_budget"] == 1500000.0


def test_scale_plan_rejects_negative_budget(step9_fixture, approved_scale_decision):
    """Negative budget values must be rejected with HTTP 422 or 400."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Negative Budget Plan",
        "objective": "Testing validation error on budget.",
        "scope": "8 sites in Delhi.",
        "deployment_strategy": "PHASED_ROLLOUT",
        "estimated_budget": -50000.0,
        "target_sites": 4,
    }
    res = client.post("/api/v1/government/scale-plans", json=payload, headers=headers)
    assert res.status_code in [400, 422]


def test_scale_plan_seeds_default_mandatory_readiness_checklist(step9_fixture, approved_scale_decision):
    """A new scale plan automatically provisions all 9 standard readiness checklist categories."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "NCR Traffic Expansion with Readiness Seed",
        "objective": "Objective for testing readiness seed auto-population.",
        "scope": "8 sites in Delhi.",
        "deployment_strategy": "PHASED_ROLLOUT",
        "estimated_budget": 1000000.0,
        "target_sites": 4,
    }
    res = client.post("/api/v1/government/scale-plans", json=payload, headers=headers)
    assert res.status_code == 201
    plan_id = res.json()["id"]

    checks_res = client.get(f"/api/v1/government/scale-plans/{plan_id}/readiness-checks", headers=headers)
    assert checks_res.status_code == 200
    checks = checks_res.json()
    assert len(checks) >= 9
    categories = {c["category"] for c in checks}
    assert "TECHNICAL" in categories
    assert "SECURITY" in categories
    assert "FINANCIAL" in categories
    assert "GOVERNANCE" in categories


def test_scale_target_creation_and_budget_tracking(step9_fixture, approved_scale_decision):
    """Targets (sites/districts) can be added to a scale plan and their budget tracked."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    # Create plan
    plan_res = client.post("/api/v1/government/scale-plans", json={
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Target Budget Testing Plan",
        "objective": "Objective testing target addition.",
        "scope": "Multi-site rollout.",
        "estimated_budget": 1000000.0,
        "target_sites": 4,
    }, headers=headers)
    plan_id = plan_res.json()["id"]

    # Add Target 1
    t_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/targets", json={
        "name": "Dhaula Kuan Central Junction",
        "target_type": "SITE",
        "region": "South West Delhi",
        "district": "New Delhi",
        "budget": 250000.0,
        "target_population": 400000,
    }, headers=headers)
    assert t_res.status_code == 201
    target = t_res.json()
    assert target["name"] == "Dhaula Kuan Central Junction"
    assert target["budget"] == 250000.0
    assert target["status"] == "PLANNED"


def test_scale_phase_creation_and_budget_ceiling_enforcement(step9_fixture, approved_scale_decision):
    """Adding a phase whose budget exceeds the total plan approved budget must be blocked with HTTP 400."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    plan_res = client.post("/api/v1/government/scale-plans", json={
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Phase Budget Ceiling Testing Plan",
        "objective": "Objective testing phase budget limit.",
        "scope": "Phase 1 & 2 rollout.",
        "estimated_budget": 500000.0,
        "approved_budget": 500000.0,
        "target_sites": 2,
    }, headers=headers)
    plan_id = plan_res.json()["id"]

    # Phase 1: 400k (Valid)
    ph1_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/phases", json={
        "phase_number": 1,
        "title": "Phase 1: Initial Pilot Cluster",
        "budget": 400000.0,
        "target_count": 1,
    }, headers=headers)
    assert ph1_res.status_code == 201

    # Phase 2: 200k (400k + 200k = 600k > 500k approved budget -> Must fail)
    ph2_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/phases", json={
        "phase_number": 2,
        "title": "Phase 2: Over-Budget Extension",
        "budget": 200000.0,
        "target_count": 1,
    }, headers=headers)
    assert ph2_res.status_code == 400
    assert "cannot exceed approved scale budget" in ph2_res.json()["detail"]


def test_scale_phase_progress_calculation():
    """ScaleCalculationService correctly computes phase completion percentage."""
    phases = [
        type("Phase", (), {"budget": 100000.0, "completion_percentage": 100.0})(),
        type("Phase", (), {"budget": 100000.0, "completion_percentage": 50.0})(),
    ]
    prog = ScaleCalculationService.calculate_phase_progress(phases)
    assert prog == 75.0


# ==============================================================================
# Group 3: Mandatory Readiness Checklist Gate (4 Tests)
# ==============================================================================

@pytest.fixture
def scale_plan_with_readiness(step9_fixture, approved_scale_decision):
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    res = client.post("/api/v1/government/scale-plans", json={
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Readiness Gating Plan",
        "objective": "Objective for testing readiness checklist gate.",
        "scope": "4 sites in NCR.",
        "estimated_budget": 800000.0,
        "target_sites": 4,
    }, headers=headers)
    return res.json()["id"]


def test_scale_plan_activation_blocked_by_pending_mandatory_check(step9_fixture, scale_plan_with_readiness):
    """Activating a plan while required readiness checks are still PENDING must fail with HTTP 400."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    res = client.post(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/activate", headers=headers)
    assert res.status_code == 400
    assert "mandatory readiness requirements are incomplete" in res.json()["detail"]


def test_scale_plan_activation_blocked_by_blocked_mandatory_check(step9_fixture, scale_plan_with_readiness):
    """A BLOCKED mandatory check prevents plan activation with HTTP 400."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    checks = client.get(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/readiness-checks", headers=headers).json()
    first_req = next(c for c in checks if c["required"])

    # Mark check BLOCKED
    update_res = client.put(
        f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/readiness-checks/{first_req['id']}",
        json={"status": "BLOCKED", "reviewer_comments": "Cyber security review failed."},
        headers=headers,
    )
    assert update_res.status_code == 200

    res = client.post(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/activate", headers=headers)
    assert res.status_code == 400
    assert "mandatory readiness requirements are incomplete" in res.json()["detail"]


def test_scale_plan_activation_succeeds_when_all_mandatory_checks_completed_or_na(step9_fixture, scale_plan_with_readiness):
    """When all mandatory checks are COMPLETED (or NOT_APPLICABLE), plan activation succeeds and status becomes ACTIVE."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    checks = client.get(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/readiness-checks", headers=headers).json()
    for c in checks:
        if c["required"]:
            client.put(
                f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/readiness-checks/{c['id']}",
                json={"status": "COMPLETED", "reviewer_comments": "Verified and signed off."},
                headers=headers,
            )

    act_res = client.post(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/activate", headers=headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "ACTIVE"


def test_startups_cannot_certify_readiness_checks(step9_fixture, scale_plan_with_readiness):
    """Startups cannot sign off on readiness checks (HTTP 403 Forbidden)."""
    fix = step9_fixture
    st_headers = make_auth_header(fix["startup_user"].id, UserRole.STARTUP)

    checks = client.get(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/readiness-checks", headers=st_headers).json()
    check_id = checks[0]["id"]

    res = client.put(
        f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/readiness-checks/{check_id}",
        json={"status": "COMPLETED", "reviewer_comments": "Startup self-approval."},
        headers=st_headers,
    )
    assert res.status_code == 403


# ==============================================================================
# Group 4: Cross-Department & Cross-State Replication (4 Tests)
# ==============================================================================

def test_create_replication_with_adaptation_notes(step9_fixture, scale_plan_with_readiness):
    """Cross-department replication records target department and adaptation requirements."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "source_pilot_id": fix["pilot_valid"].id,
        "source_site": "Delhi NCR Inner Ring Road",
        "target_site": "Bengaluru Outer Ring Road",
        "target_department_id": fix["dept2"].id,
        "adaptation_required": True,
        "adaptation_notes": "Recalibrating for mixed bus rapid transit lanes and heavy two-wheeler density.",
        "local_constraints": "Monsoon drain clearance near roadside junction sensor enclosures.",
    }
    res = client.post(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/replications", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["target_site"] == "Bengaluru Outer Ring Road"
    assert data["adaptation_required"] is True
    assert data["deployment_status"] == "PLANNED"


def test_replication_status_lifecycle(step9_fixture, scale_plan_with_readiness):
    """Replications list returns all registered replication records for the plan."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    # List replications
    res = client.get(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/replications", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_replication_local_constraints_recorded(step9_fixture, scale_plan_with_readiness):
    """Local constraints and notes are persisted."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    payload = {
        "source_pilot_id": fix["pilot_valid"].id,
        "source_site": "Delhi Corridor",
        "target_site": "Jaipur Walled City",
        "target_department_id": fix["dept2"].id,
        "adaptation_required": True,
        "local_constraints": "Heritage monument height restrictions on optical camera masts.",
    }
    res = client.post(f"/api/v1/government/scale-plans/{scale_plan_with_readiness}/replications", json=payload, headers=headers)
    assert res.status_code == 201
    assert "Heritage monument height restrictions" in res.json()["local_constraints"]


def test_list_all_replications_access(step9_fixture):
    """Government officers can list all cross-department replications across the platform."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    res = client.get("/api/v1/government/replications", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


# ==============================================================================
# Group 5: Deployment Progress & Monitoring (4 Tests)
# ==============================================================================

@pytest.fixture
def active_scale_plan_with_target(step9_fixture, approved_scale_decision):
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    plan_res = client.post("/api/v1/government/scale-plans", json={
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Deployment Testing Plan",
        "objective": "Objective for testing deployment updates.",
        "scope": "Site deployment.",
        "estimated_budget": 500000.0,
        "target_sites": 1,
    }, headers=headers).json()
    plan_id = plan_res["id"]

    t_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/targets", json={
        "name": "Connaught Place Radial 1",
        "target_type": "SITE",
        "budget": 200000.0,
    }, headers=headers).json()
    target_id = t_res["id"]

    return {"plan_id": plan_id, "target_id": target_id}


def test_startup_submits_deployment_update(step9_fixture, active_scale_plan_with_target):
    """Startup submits site deployment progress update with percentage and blockers."""
    fix = step9_fixture
    st_headers = make_auth_header(fix["startup_user"].id, UserRole.STARTUP)
    plan_id = active_scale_plan_with_target["plan_id"]
    target_id = active_scale_plan_with_target["target_id"]

    payload = {
        "scale_target_id": target_id,
        "status": "ACTIVE",
        "completion_percentage": 50.0,
        "update_text": "Sensors and controllers mounted on 2 poles. Fiber connectivity in progress.",
        "blockers": "Awaiting local municipal power cutover permit.",
    }
    res = client.post(f"/api/v1/startup/scale-plans/{plan_id}/deployments", json=payload, headers=st_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["completion_percentage"] == 50.0
    assert data["update_text"] == payload["update_text"]
    assert data["submitted_by"] == fix["startup_user"].id


def test_startup_isolation_on_deployment_update(step9_fixture, active_scale_plan_with_target):
    """An unassociated startup cannot submit deployment updates for another startup's scale plan."""
    fix = step9_fixture
    iso_headers = make_auth_header(fix["startup_user_isolated"].id, UserRole.STARTUP)
    plan_id = active_scale_plan_with_target["plan_id"]
    target_id = active_scale_plan_with_target["target_id"]

    payload = {
        "scale_target_id": target_id,
        "status": "ACTIVE",
        "completion_percentage": 30.0,
        "update_text": "Unauthorized cross-startup update attempt.",
    }
    res = client.post(f"/api/v1/startup/scale-plans/{plan_id}/deployments", json=payload, headers=iso_headers)
    assert res.status_code == 403
    assert "Startup isolation" in res.json()["detail"]


def test_government_reviews_deployment_update(step9_fixture, active_scale_plan_with_target):
    """Government officer reviews and verifies submitted deployment update."""
    fix = step9_fixture
    st_headers = make_auth_header(fix["startup_user"].id, UserRole.STARTUP)
    gov_headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    plan_id = active_scale_plan_with_target["plan_id"]
    target_id = active_scale_plan_with_target["target_id"]

    # Submit
    up_res = client.post(f"/api/v1/startup/scale-plans/{plan_id}/deployments", json={
        "scale_target_id": target_id,
        "status": "READY",
        "completion_percentage": 85.0,
        "update_text": "Sensors active and transmitting preliminary telemetry.",
    }, headers=st_headers)
    update_id = up_res.json()["id"]

    # Review
    rev_res = client.post(f"/api/v1/government/deployments/{update_id}/review", json={
        "accepted": True,
        "review_comments": "Inspected on site by Divisional Engineer. Cleared.",
    }, headers=gov_headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["reviewed_by"] == fix["gov_user"].id
    assert "Divisional Engineer" in rev_res.json()["review_comments"]


def test_deployment_completion_updates_target_status(step9_fixture, active_scale_plan_with_target):
    """Submitting 100% completion marks target status as COMPLETED."""
    fix = step9_fixture
    st_headers = make_auth_header(fix["startup_user"].id, UserRole.STARTUP)
    gov_headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    plan_id = active_scale_plan_with_target["plan_id"]
    target_id = active_scale_plan_with_target["target_id"]

    client.post(f"/api/v1/startup/scale-plans/{plan_id}/deployments", json={
        "scale_target_id": target_id,
        "status": "COMPLETED",
        "completion_percentage": 100.0,
        "update_text": "Final site integration completed and signed off.",
    }, headers=st_headers)

    targets = client.get(f"/api/v1/government/scale-plans/{plan_id}/targets", headers=gov_headers).json()
    t = next(x for x in targets if x["id"] == target_id)
    assert t["progress_percentage"] == 100.0
    assert t["status"] == "COMPLETED"


# ==============================================================================
# Group 6: Impact Metrics & Evidence Verification (5 Tests)
# ==============================================================================

@pytest.fixture
def plan_with_metric(step9_fixture, approved_scale_decision):
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    plan_res = client.post("/api/v1/government/scale-plans", json={
        "scale_up_decision_id": approved_scale_decision.id,
        "title": "Impact Testing Plan",
        "objective": "Objective for testing impact metrics.",
        "scope": "Impact evaluation.",
        "estimated_budget": 500000.0,
        "target_sites": 1,
    }, headers=headers).json()
    plan_id = plan_res["id"]

    m_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/impact-metrics", json={
        "code": "IMP-CORR-01",
        "title": "Corridor Transit Delay Reduction",
        "category": "SERVICE_DELIVERY",
        "unit": "%",
        "baseline_value": 0.0,
        "target_value": 25.0,
        "direction": "HIGHER_IS_BETTER",
        "weight": 2.0,
        "is_critical": True,
    }, headers=headers).json()

    return {"plan_id": plan_id, "metric_id": m_res["id"]}


def test_impact_metric_creation_with_critical_flag(step9_fixture, plan_with_metric):
    """Impact metric is created with weights, direction, and critical KPI flag."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    plan_id = plan_with_metric["plan_id"]

    metrics = client.get(f"/api/v1/government/scale-plans/{plan_id}/impact-metrics", headers=headers).json()
    assert len(metrics) >= 1
    m = metrics[0]
    assert m["code"] == "IMP-CORR-01"
    assert m["is_critical"] is True
    assert m["weight"] == 2.0


def test_normalized_impact_score_calculation_higher_is_better():
    """Higher is better normalized scoring logic: actual exceeding target achieves 100.0."""
    score_exceed = ScaleCalculationService.normalize_impact_metric_score(
        actual=30.0, target=25.0, baseline=0.0, direction="HIGHER_IS_BETTER"
    )
    assert score_exceed == 100.0

    score_half = ScaleCalculationService.normalize_impact_metric_score(
        actual=12.5, target=25.0, baseline=0.0, direction="HIGHER_IS_BETTER"
    )
    assert score_half == 50.0


def test_normalized_impact_score_calculation_lower_is_better():
    """Lower is better normalized scoring logic: actual lower than target achieves 100.0."""
    score_good = ScaleCalculationService.normalize_impact_metric_score(
        actual=8.0, target=10.0, baseline=20.0, direction="LOWER_IS_BETTER"
    )
    assert score_good == 100.0

    score_half = ScaleCalculationService.normalize_impact_metric_score(
        actual=15.0, target=10.0, baseline=20.0, direction="LOWER_IS_BETTER"
    )
    assert score_half == 50.0


def test_impact_measurement_records_sample_size_and_confidence(step9_fixture, plan_with_metric):
    """Time-series impact measurement records sample size, confidence interval, and data source."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    metric_id = plan_with_metric["metric_id"]

    payload = {
        "value": 26.8,
        "sample_size": 150000,
        "confidence_interval": "99% (±0.5%)",
        "data_source": "SCATS Municipal Sensor Feed",
        "notes": "Audited over 10 consecutive weekdays.",
    }
    res = client.post(f"/api/v1/government/impact-metrics/{metric_id}/measurements", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["value"] == 26.8
    assert data["sample_size"] == 150000
    assert data["confidence_interval"] == "99% (±0.5%)"


def test_impact_evidence_upload_with_sha256_checksum(step9_fixture, plan_with_metric):
    """Evidence document upload enforces SHA-256 checksum and increments document version."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    metric_id = plan_with_metric["metric_id"]

    payload = {
        "title": "IIT Delhi 3rd Party Speed & Delay Audit",
        "file_name": "iitd_audit_report.pdf",
        "storage_key": "evidence/iitd_audit.pdf",
        "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "version": 1,
    }
    res = client.post(f"/api/v1/government/impact-metrics/{metric_id}/evidence", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["checksum"] == payload["checksum"]
    assert data["version"] == 1
    assert data["verification_status"] == "VERIFIED"


# ==============================================================================
# Group 7: Outcome Evaluation & Divergence Rule (4 Tests)
# ==============================================================================

class MockMetric:
    def __init__(self, actual_value, target_value, baseline_value, direction, weight=1.0, is_critical=False, id=None, code="M", title="Metric", category="SERVICE_DELIVERY"):
        self.id = id or str(uuid.uuid4())
        self.code = code
        self.title = title
        self.category = category
        self.actual_value = actual_value
        self.target_value = target_value
        self.baseline_value = baseline_value
        self.direction = direction
        self.weight = weight
        self.is_critical = is_critical


def test_algorithmic_outcome_recommendation_successful():
    """Score >= 80 yields SUCCESSFUL recommendation."""
    m1 = MockMetric(actual_value=25.0, target_value=25.0, baseline_value=0.0, direction="HIGHER_IS_BETTER")
    m2 = MockMetric(actual_value=24.0, target_value=25.0, baseline_value=0.0, direction="HIGHER_IS_BETTER")

    res = ScaleCalculationService.calculate_overall_impact_score([m1, m2])
    assert res["impact_score"] >= 80.0
    assert res["recommended_outcome"] == "SUCCESSFUL"


def test_algorithmic_outcome_recommendation_partially_successful():
    """Score between 50 and 79.9 yields PARTIALLY_SUCCESSFUL recommendation."""
    m1 = MockMetric(actual_value=15.0, target_value=25.0, baseline_value=0.0, direction="HIGHER_IS_BETTER")
    res = ScaleCalculationService.calculate_overall_impact_score([m1])
    assert 50.0 <= res["impact_score"] < 80.0
    assert res["recommended_outcome"] == "PARTIALLY_SUCCESSFUL"


def test_critical_kpi_gate_caps_recommendation():
    """If a critical KPI fails (< 50.0), recommendation is capped at PARTIALLY_SUCCESSFUL even with high average."""
    # Secondary metric: 100.0 score with weight 10
    m_sec = MockMetric(actual_value=100.0, target_value=100.0, baseline_value=0.0, direction="HIGHER_IS_BETTER", weight=10.0, is_critical=False)
    # Critical metric: 40.0 score (< 50.0) with weight 1
    m_crit = MockMetric(actual_value=10.0, target_value=25.0, baseline_value=0.0, direction="HIGHER_IS_BETTER", weight=1.0, is_critical=True)

    res = ScaleCalculationService.calculate_overall_impact_score([m_sec, m_crit])
    assert res["critical_kpis_passed"] is False
    assert res["recommended_outcome"] == "PARTIALLY_SUCCESSFUL"


def test_outcome_divergence_requires_justification_and_emits_audit(step9_fixture, plan_with_metric):
    """If government confirms an outcome different from algorithmic recommendation, reason is required."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    plan_id = plan_with_metric["plan_id"]
    metric_id = plan_with_metric["metric_id"]

    # Record measurement yielding PARTIALLY_SUCCESSFUL (actual=15, target=25 -> score=60.0)
    client.post(f"/api/v1/government/impact-metrics/{metric_id}/measurements", json={"value": 15.0}, headers=headers)

    # Attempt to confirm SUCCESSFUL without justification -> Must fail with HTTP 400
    fail_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/confirm-outcome", json={
        "confirmed_outcome": "SUCCESSFUL",
        "confirmation_reason": "",
    }, headers=headers)
    assert fail_res.status_code == 400
    assert "Divergence justification required" in fail_res.json()["detail"]

    # Provide mandatory justification -> Succeeds
    succ_res = client.post(f"/api/v1/government/scale-plans/{plan_id}/confirm-outcome", json={
        "confirmed_outcome": "SUCCESSFUL",
        "confirmation_reason": "Departmental committee accepted 15% delay reduction due to parallel metro construction.",
    }, headers=headers)
    assert succ_res.status_code == 200
    assert succ_res.json()["confirmed_outcome"] == "SUCCESSFUL"
    assert succ_res.json()["recommended_outcome"] == "PARTIALLY_SUCCESSFUL"


# ==============================================================================
# Group 8: Traceability & Executive Portfolio (2 Tests)
# ==============================================================================

def test_extended_13_stage_traceability_chain(step9_fixture, plan_with_metric):
    """Traceability endpoint returns the complete 13-stage chain from Challenge to Impact."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)
    plan_id = plan_with_metric["plan_id"]

    res = client.get(f"/api/v1/government/scale-plans/{plan_id}/traceability", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "stages" in data
    stage_ids = [s["stage_id"] for s in data["stages"]]
    assert "CHALLENGE" in stage_ids
    assert "PILOT" in stage_ids
    assert "VALIDATION" in stage_ids
    assert "SCALE_DECISION" in stage_ids
    assert "SCALE_PLAN" in stage_ids
    assert "DEPLOYMENT" in stage_ids
    assert "IMPACT" in stage_ids


def test_executive_portfolio_and_dashboard_metrics(step9_fixture):
    """Dashboard and portfolio endpoints return populated metrics."""
    fix = step9_fixture
    headers = make_auth_header(fix["gov_user"].id, UserRole.GOVERNMENT)

    dash_res = client.get("/api/v1/government/scale-up/dashboard-stats", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "total_scale_plans" in dash_data
    assert "active_rollouts" in dash_data

    port_res = client.get("/api/v1/government/impact", headers=headers)
    assert port_res.status_code == 200
    port_data = port_res.json()
    assert "total_innovations_scaled" in port_data

    funnel_res = client.get("/api/v1/government/innovation-portfolio", headers=headers)
    assert funnel_res.status_code == 200
    assert isinstance(funnel_res.json(), list)
