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
from app.models.pilot_kpi import (
    PilotKPI,
    KPICategory,
    KPIMeasurementType,
    KPIDirection,
    TargetOperator,
    KPIStatus,
    KPIMeasurement,
    KPIEvidence,
    EvidenceType,
)
from app.models.validation_workflow import (
    ValidatorProfile,
    ValidatorAvailability,
    ValidationAssignment,
    ValidatorConflictOfInterest,
    ValidatorCOIDeclaration,
    ValidationReport,
    ValidationAssessment,
    ValidationConfidence,
    KPIValidation,
    KPIValidationResult,
    PilotValidationStatus,
)
from app.core.security import UserRole, hash_password, create_access_token
from app.services.kpi_calculation_service import KPICalculationService

client = TestClient(app)


def make_auth_header(user_id: str, role) -> dict:
    role_str = role.value if hasattr(role, "value") else str(role)
    token = create_access_token({"sub": str(user_id), "role": role_str})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def step7_data():
    db = SessionLocal()
    u = uuid.uuid4().hex[:6]

    # Department
    dept = Department(
        name=f"Ministry of Health {u}",
        code=f"MOH_{u}",
        ministry="Ministry of Health and Family Welfare",
        contact_email=f"health_{u}@gov.in",
        description="Health and telemetry",
    )
    db.add(dept)
    db.flush()

    # Government User
    gov = User(
        email=f"health_officer_{u}@moh.gov.in",
        password_hash=hash_password("GovPass123!"),
        full_name="Dr. Health Officer",
        role=UserRole.GOVERNMENT,
        department_id=dept.id,
        is_active=True,
    )
    # Another Government User from different department
    other_dept = Department(
        name=f"Ministry of Mines {u}",
        code=f"MINES_{u}",
        ministry="Ministry of Mines",
        contact_email=f"mines_{u}@gov.in",
    )
    db.add(other_dept)
    db.flush()

    other_gov = User(
        email=f"mines_officer_{u}@mines.gov.in",
        password_hash=hash_password("GovPass123!"),
        full_name="Mines Officer",
        role=UserRole.GOVERNMENT,
        department_id=other_dept.id,
        is_active=True,
    )

    # Startup & User
    st_user = User(
        email=f"founder_{u}@healthai.io",
        password_hash=hash_password("Startup123!"),
        full_name="Health AI Founder",
        role=UserRole.STARTUP,
        is_active=True,
    )
    db.add_all([gov, other_gov, st_user])
    db.flush()

    st_profile = Startup(
        user_id=st_user.id,
        company_name=f"HealthAI Diagnostic Systems {u}",
        dpiit_recognition_number=f"DPIIT-{u}",
        sector="HealthTech",
    )
    db.add(st_profile)
    db.flush()
    st_user.startup_id = st_profile.id

    # Validator User & Profile
    val_user = User(
        email=f"auditor_{u}@healthcert.org",
        password_hash=hash_password("ValPass123!"),
        full_name="Dr. Auditor NABL",
        role=UserRole.VALIDATOR,
        is_active=True,
    )
    val_user2 = User(
        email=f"auditor2_{u}@healthcert.org",
        password_hash=hash_password("ValPass123!"),
        full_name="Dr. Auditor Two",
        role=UserRole.VALIDATOR,
        is_active=True,
    )
    db.add_all([val_user, val_user2])
    db.flush()

    val_prof = ValidatorProfile(
        user_id=val_user.id,
        organization="National Healthcare Technology Assessment Agency",
        domain_expertise="Clinical AI Diagnostics, GFR Compliance",
        qualifications="Ph.D. in Biomedical Engineering",
        accreditations="NABL #MC-2041",
        years_of_experience=15,
        availability=ValidatorAvailability.AVAILABLE.value,
        is_verified=True,
    )
    val_prof2 = ValidatorProfile(
        user_id=val_user2.id,
        organization="Independent Testing Labs",
        domain_expertise="Medical Devices & Software",
        qualifications="M.Tech Clinical Systems",
        accreditations="ISO 13485 Lead Assessor",
        years_of_experience=10,
        availability=ValidatorAvailability.AVAILABLE.value,
        is_verified=True,
    )
    db.add_all([val_prof, val_prof2])
    db.flush()

    # Challenge & Application
    ch = Challenge(
        challenge_code=f"CH-{u}",
        department_id=dept.id,
        created_by=gov.id,
        title="AI Diagnostic Telemetry in Rural Primary Health Centers",
        problem_statement="Shortage of specialists in remote PHCs.",
        desired_outcome="Reliable diagnostic screening at primary centers.",
        domain="HealthTech",
        status="ACTIVE",
    )
    db.add(ch)
    db.flush()

    app_rec = Application(
        application_code=f"APP-{u}",
        challenge_id=ch.id,
        startup_id=st_profile.id,
        submitted_by=st_user.id,
        status="SELECTED_FOR_PILOT",
        proposal_title="Edge Diagnostic Scanner",
    )
    db.add(app_rec)
    db.flush()

    # Pilot
    pilot = Pilot(
        pilot_code=f"PILOT-TEST-{u}",
        application_id=app_rec.id,
        challenge_id=ch.id,
        startup_id=st_profile.id,
        government_department_id=dept.id,
        title="Rural PHC AI Diagnostic Sandbox Pilot",
        status=PilotStatus.COMPLETED.value,
        success_status=PilotSuccessStatus.NOT_ASSESSED.value,
        validation_status=PilotValidationStatus.NOT_STARTED.value,
        start_date=date(2026, 5, 1),
        end_date=date(2026, 7, 31),
        pilot_budget=900000.0,
    )
    db.add(pilot)
    db.flush()

    # Seed an active initial KPI
    kpi = PilotKPI(
        pilot_id=pilot.id,
        name="Diagnostic Accuracy Rate",
        description="Diagnostic sensitivity against gold standard lab tests.",
        category=KPICategory.QUALITY.value,
        measurement_type=KPIMeasurementType.PERCENTAGE.value,
        unit="%",
        baseline_value=65.0,
        baseline_date=date(2026, 5, 1),
        target_value=90.0,
        target_date=date(2026, 7, 31),
        target_operator=TargetOperator.GREATER_THAN_OR_EQUAL.value,
        direction=KPIDirection.HIGHER_IS_BETTER.value,
        weight=2.0,
        status=KPIStatus.ACTIVE.value,
        verification_method="Blind lab comparison on 500 samples.",
        created_by=gov.id,
    )
    db.add(kpi)
    db.commit()

    context = {
        "pilot_id": str(pilot.id),
        "kpi_id": str(kpi.id),
        "gov_headers": make_auth_header(gov.id, gov.role),
        "other_gov_headers": make_auth_header(other_gov.id, other_gov.role),
        "startup_headers": make_auth_header(st_user.id, st_user.role),
        "val_headers": make_auth_header(val_user.id, val_user.role),
        "val_prof_id": str(val_prof.id),
        "val2_headers": make_auth_header(val_user2.id, val_user2.role),
        "val_prof2_id": str(val_prof2.id),
        "gov_id": str(gov.id),
    }
    db.close()
    return context


# -------------------------------------------------------------
# 1. UNIT CALCULATIONS TEST
# -------------------------------------------------------------
def test_kpi_calculation_service():
    # Higher is Better
    res1 = KPICalculationService.evaluate_kpi(
        actual=85.0, target=80.0, baseline=50.0, direction="HIGHER_IS_BETTER", operator="GREATER_THAN_OR_EQUAL"
    )
    assert res1["is_met"] is True
    assert res1["achievement_percentage"] > 100.0
    assert res1["result"] == "ACHIEVED"

    # Lower is Better
    res2 = KPICalculationService.evaluate_kpi(
        actual=35.0, target=40.0, baseline=100.0, direction="LOWER_IS_BETTER", operator="LESS_THAN_OR_EQUAL"
    )
    assert res2["is_met"] is True
    assert res2["achievement_percentage"] > 100.0
    assert res2["result"] == "ACHIEVED"

    # Target Not Met
    res3 = KPICalculationService.evaluate_kpi(
        actual=45.0, target=80.0, baseline=20.0, direction="HIGHER_IS_BETTER", operator="GREATER_THAN_OR_EQUAL"
    )
    assert res3["is_met"] is False
    assert res3["achievement_percentage"] < 50.0
    assert res3["result"] == "NOT_ACHIEVED"

    # Overall Assessment Rules
    items = [
        {"weight": 2.0, "achievement_percentage": 95.0, "is_met": True},
        {"weight": 1.0, "achievement_percentage": 88.0, "is_met": True},
    ]
    overall = KPICalculationService.calculate_overall_assessment(items)
    assert overall["overall_assessment"] == "SUCCESSFUL"
    assert overall["kpis_achieved_count"] == 2

    # Partial
    partial_items = [
        {"weight": 1.0, "achievement_percentage": 60.0, "is_met": False},
        {"weight": 1.0, "achievement_percentage": 70.0, "is_met": True},
    ]
    overall_part = KPICalculationService.calculate_overall_assessment(partial_items)
    assert overall_part["overall_assessment"] == "PARTIALLY_SUCCESSFUL"

    # Inconclusive on missing evidence
    overall_incon = KPICalculationService.calculate_overall_assessment(items, evidence_sufficient=False)
    assert overall_incon["overall_assessment"] == "INCONCLUSIVE"


# -------------------------------------------------------------
# 2. KPI CRUD ENDPOINT TESTS
# -------------------------------------------------------------
def test_create_kpi_by_government(step7_data):
    headers = step7_data["gov_headers"]
    pilot_id = step7_data["pilot_id"]

    payload = {
        "name": "Emergency Case Triage Latency",
        "description": "Time in seconds to generate risk score.",
        "category": "TIME",
        "measurement_type": "TIME",
        "unit": "seconds",
        "baseline_value": 300.0,
        "baseline_date": "2026-05-01",
        "target_value": 60.0,
        "target_date": "2026-07-31",
        "target_operator": "LESS_THAN_OR_EQUAL",
        "direction": "LOWER_IS_BETTER",
        "weight": 1.5,
    }

    res = client.post(f"/api/v1/pilots/{pilot_id}/kpis", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Emergency Case Triage Latency"
    assert data["target_value"] == 60.0
    assert data["unit"] == "seconds"
    assert data["weight"] == 1.5


def test_create_kpi_unauthorized_startup(step7_data):
    headers = step7_data["startup_headers"]
    pilot_id = step7_data["pilot_id"]

    payload = {
        "name": "Startup Defined KPI",
        "unit": "%",
        "target_value": 100.0,
    }
    res = client.post(f"/api/v1/pilots/{pilot_id}/kpis", json=payload, headers=headers)
    assert res.status_code == 403


def test_list_and_detail_kpis(step7_data):
    headers = step7_data["startup_headers"]
    pilot_id = step7_data["pilot_id"]
    kpi_id = step7_data["kpi_id"]

    res = client.get(f"/api/v1/pilots/{pilot_id}/kpis", headers=headers)
    assert res.status_code == 200
    kpis = res.json()
    assert len(kpis) >= 1

    res_det = client.get(f"/api/v1/kpis/{kpi_id}", headers=headers)
    assert res_det.status_code == 200
    assert res_det.json()["id"] == kpi_id


# -------------------------------------------------------------
# 3. MEASUREMENT & EVIDENCE TESTS
# -------------------------------------------------------------
def test_record_measurement_and_upload_evidence(step7_data):
    headers = step7_data["startup_headers"]
    kpi_id = step7_data["kpi_id"]

    m_payload = {
        "measured_value": 92.4,
        "measurement_date": "2026-07-28",
        "reporting_period_start": "2026-05-01",
        "reporting_period_end": "2026-07-28",
        "measurement_method": "520 automated point-of-care scans verified against pathology lab PCR.",
        "sample_size": 520,
        "calculation_notes": "481 true positives, 39 true negatives, sensitivity 92.4%.",
    }
    m_res = client.post(f"/api/v1/kpis/{kpi_id}/measurements", json=m_payload, headers=headers)
    assert m_res.status_code == 201
    m_data = m_res.json()
    assert m_data["measured_value"] == 92.4
    measurement_id = m_data["id"]

    fake_csv = b"sample_id,result,ground_truth\nS001,POS,POS\nS002,NEG,NEG\n"
    files = {"file": ("diagnostic_raw_samples.csv", io.BytesIO(fake_csv), "text/csv")}
    data = {
        "title": "Raw Diagnostic Sample Logs",
        "description": "De-identified patient sample matching logs.",
        "evidence_type": "DATASET",
        "measurement_id": measurement_id,
        "source": "PHC Edge Terminal",
    }
    e_res = client.post(f"/api/v1/kpis/{kpi_id}/evidence", files=files, data=data, headers=headers)
    assert e_res.status_code == 201
    e_data = e_res.json()
    assert e_data["title"] == "Raw Diagnostic Sample Logs"
    assert e_data["version"] == 1
    evidence_id = e_data["id"]

    dl_res = client.get(f"/api/v1/kpi-evidence/{evidence_id}/download", headers=headers)
    assert dl_res.status_code == 200
    assert b"sample_id,result" in dl_res.content


# -------------------------------------------------------------
# 4. VALIDATOR ASSIGNMENT & COI GATING TESTS
# -------------------------------------------------------------
def test_assign_validator_and_coi_flow(step7_data):
    gov_headers = step7_data["gov_headers"]
    val_headers = step7_data["val_headers"]
    pilot_id = step7_data["pilot_id"]
    val_prof_id = step7_data["val_prof_id"]

    # 1. Government assigns validator
    assign_payload = {
        "pilot_id": pilot_id,
        "validator_id": val_prof_id,
        "scope": "Comprehensive validation of AI diagnostic sensitivity and rural connectivity resilience.",
        "terms_of_reference": "Empirical audit of 500 pathology cases and site inspection of 3 PHCs.",
        "deadline": "2026-08-15",
    }
    as_res = client.post(f"/api/v1/government/pilots/{pilot_id}/assign-validator", json=assign_payload, headers=gov_headers)
    assert as_res.status_code == 201
    assignment = as_res.json()
    assignment_id = assignment["id"]
    assert assignment["status"] == "ASSIGNED"
    assert assignment["coi_declared"] is False

    # 2. Validator accepts assignment
    resp_payload = {"action": "ACCEPT"}
    acc_res = client.post(f"/api/v1/validator/assignments/{assignment_id}/respond", json=resp_payload, headers=val_headers)
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "ACCEPTED"

    # 3. Validator workspace accessible
    ws_res = client.get(f"/api/v1/validator/assignments/{assignment_id}/workspace", headers=val_headers)
    assert ws_res.status_code == 200
    ws_data = ws_res.json()
    assert "pilot" in ws_data
    assert "kpis" in ws_data
    assert len(ws_data["kpis"]) >= 1

    # 4. Declare clean COI
    coi_payload = {
        "declaration": "NO_CONFLICT",
        "has_financial_interest": False,
        "has_past_employment": False,
        "has_personal_relationship": False,
        "has_competitive_interest": False,
        "declaration_details": "No commercial or advisory engagement with HealthAI Diagnostic Systems.",
    }
    coi_res = client.post(f"/api/v1/validator/assignments/{assignment_id}/coi", json=coi_payload, headers=val_headers)
    assert coi_res.status_code == 200
    assert coi_res.json()["declaration"] == "NO_CONFLICT"
    assert coi_res.json()["is_cleared"] is True


def test_coi_conflict_declared_locks_assignment(step7_data):
    gov_headers = step7_data["gov_headers"]
    val2_headers = step7_data["val2_headers"]
    pilot_id = step7_data["pilot_id"]
    val_prof2_id = step7_data["val_prof2_id"]

    # Assign validator 2
    assign_payload = {
        "pilot_id": pilot_id,
        "validator_id": val_prof2_id,
        "scope": "Independent audit.",
    }
    as_res = client.post(f"/api/v1/government/pilots/{pilot_id}/assign-validator", json=assign_payload, headers=gov_headers)
    assignment_id = as_res.json()["id"]

    # Declare Conflict
    coi_conflict = {
        "declaration": "CONFLICT_DECLARED",
        "has_financial_interest": True,
        "declaration_details": "Validator owns 2% equity in a direct competitor company.",
    }
    c_res = client.post(f"/api/v1/validator/assignments/{assignment_id}/coi", json=coi_conflict, headers=val2_headers)
    assert c_res.status_code == 200
    assert c_res.json()["declaration"] == "CONFLICT_DECLARED"
    assert c_res.json()["is_cleared"] is False

    # Attempt to submit report with conflict -> blocked!
    sub_payload = {
        "executive_summary": "Attempting to submit report despite conflict.",
        "methodology": "Standard testing methodology.",
        "overall_assessment": "SUCCESSFUL",
        "findings": "Finding details here.",
        "recommendations": "Recommendation details here.",
        "kpi_validations": [],
    }
    sub_res = client.post(f"/api/v1/validator/assignments/{assignment_id}/report/submit", json=sub_payload, headers=val2_headers)
    assert sub_res.status_code in [400, 403]


# -------------------------------------------------------------
# 5. VALIDATION REPORT & SUCCESS CONFIRMATION TESTS
# -------------------------------------------------------------
def test_submit_validation_report_and_government_confirmation(step7_data):
    gov_headers = step7_data["gov_headers"]
    val_headers = step7_data["val_headers"]
    pilot_id = step7_data["pilot_id"]
    val_prof_id = step7_data["val_prof_id"]
    kpi_id = step7_data["kpi_id"]
    gov_id = step7_data["gov_id"]

    # Re-assign validator 1 for clean submission
    as_res = client.post(
        f"/api/v1/government/pilots/{pilot_id}/assign-validator",
        json={"pilot_id": pilot_id, "validator_id": val_prof_id},
        headers=gov_headers,
    )
    assignment_id = as_res.json()["id"]

    # Accept assignment
    client.post(f"/api/v1/validator/assignments/{assignment_id}/respond", json={"action": "ACCEPT"}, headers=val_headers)

    # Declare clean COI
    client.post(
        f"/api/v1/validator/assignments/{assignment_id}/coi",
        json={"declaration": "NO_CONFLICT"},
        headers=val_headers,
    )

    submit_payload = {
        "executive_summary": "Comprehensive independent clinical assessment confirms the AI scanner surpasses sensitivity criteria with zero false alarms in 520 rural screenings.",
        "methodology": "Double-blind diagnostic comparison across 3 rural primary health centers using gold-standard pathology RT-PCR.",
        "overall_assessment": "SUCCESSFUL",
        "overall_achievement_percentage": 105.0,
        "confidence_level": "HIGH",
        "findings": "1. 92.4% sensitivity demonstrated.\n2. Battery runtime exceeded 8 hours continuous telemetry.\n3. Edge inference latency averaged 1.2s.",
        "recommendations": "Recommend unconditional certification and national procurement scale-up on GeM portal under GFR Rule 149(viii).",
        "readiness_assessment": "TRL 8 - Field demonstration completed.",
        "kpi_validations": [
            {
                "kpi_id": kpi_id,
                "validator_measured_value": 92.4,
                "result": "ACHIEVED",
                "achievement_percentage": 105.0,
                "evidence_sufficiency": "SUFFICIENT",
                "validator_commentary": "Pathology telemetry matches perfectly.",
            }
        ],
    }

    sub_res = client.post(f"/api/v1/validator/assignments/{assignment_id}/report/submit", json=submit_payload, headers=val_headers)
    assert sub_res.status_code == 200
    report = sub_res.json()
    assert report["status"] == "SUBMITTED"
    assert report["overall_assessment"] == "SUCCESSFUL"
    report_id = report["id"]

    # 1. Test PDF Export
    pdf_res = client.get(f"/api/v1/government/validation-reports/{report_id}/export-pdf", headers=gov_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content[:4] == b"%PDF"

    # 2. Government reviews report
    gov_rep = client.get(f"/api/v1/government/pilots/{pilot_id}/validation-report", headers=gov_headers)
    assert gov_rep.status_code == 200
    assert gov_rep.json()["overall_assessment"] == "SUCCESSFUL"

    # 3. Government confirms success matching validator assessment
    confirm_payload = {
        "success_status": "SUCCESSFUL",
        "classification_notes": "Pilot meets and exceeds public health performance mandates. Certified for state-level scale-up.",
    }
    conf_res = client.post(f"/api/v1/government/pilots/{pilot_id}/confirm-success", json=confirm_payload, headers=gov_headers)
    assert conf_res.status_code == 200
    summary = conf_res.json()
    assert summary["success_status"] == "SUCCESSFUL"
    assert summary["validation_status"] == "VALIDATION_COMPLETED"
    assert summary["classification_confirmed_by"] == gov_id


def test_government_divergence_requires_justification(step7_data):
    gov_headers = step7_data["gov_headers"]
    val_headers = step7_data["val_headers"]
    pilot_id = step7_data["pilot_id"]
    val_prof_id = step7_data["val_prof_id"]

    # Assign validator & submit a SUCCESSFUL report
    as_res = client.post(
        f"/api/v1/government/pilots/{pilot_id}/assign-validator",
        json={"pilot_id": pilot_id, "validator_id": val_prof_id},
        headers=gov_headers,
    )
    assignment_id = as_res.json()["id"]
    client.post(f"/api/v1/validator/assignments/{assignment_id}/respond", json={"action": "ACCEPT"}, headers=val_headers)
    client.post(f"/api/v1/validator/assignments/{assignment_id}/coi", json={"declaration": "NO_CONFLICT"}, headers=val_headers)

    submit_payload = {
        "executive_summary": "Comprehensive assessment showing successful results.",
        "methodology": "Double blind empirical trials.",
        "overall_assessment": "SUCCESSFUL",
        "findings": "All targets achieved.",
        "recommendations": "Proceed to scale into statewide healthcare centers.",
        "kpi_validations": [],
    }
    sub_res = client.post(f"/api/v1/validator/assignments/{assignment_id}/report/submit", json=submit_payload, headers=val_headers)
    assert sub_res.status_code == 200

    # Attempting to declare PARTIALLY_SUCCESSFUL when validator said SUCCESSFUL without divergence justification
    divergent_payload = {
        "success_status": "PARTIALLY_SUCCESSFUL",
        "classification_notes": "We disagree with full success.",
        "classification_divergence_reason": None,
    }
    div_res = client.post(f"/api/v1/government/pilots/{pilot_id}/confirm-success", json=divergent_payload, headers=gov_headers)
    assert div_res.status_code == 400
    assert "divergence" in div_res.json()["detail"].lower()

    # With justification -> passes
    valid_divergent_payload = {
        "success_status": "PARTIALLY_SUCCESSFUL",
        "classification_notes": "Government departmental review noted battery supply chain fragility.",
        "classification_divergence_reason": "Although algorithmic accuracy was proven at 92.4%, secondary supplier component shortages in rural areas warrant a conditional partially successful rating before national scale.",
    }
    valid_res = client.post(f"/api/v1/government/pilots/{pilot_id}/confirm-success", json=valid_divergent_payload, headers=gov_headers)
    assert valid_res.status_code == 200
    assert valid_res.json()["success_status"] == "PARTIALLY_SUCCESSFUL"


def test_validation_dashboard(step7_data):
    gov_headers = step7_data["gov_headers"]

    dash_res = client.get("/api/v1/government/validation/dashboard", headers=gov_headers)
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert "counts" in data
    assert "pilots" in data
    assert data["counts"]["total_pilots"] >= 1
