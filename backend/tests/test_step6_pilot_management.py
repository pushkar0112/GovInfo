import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.challenge import Challenge
from app.models.application import Application, ApplicationStatus
from app.core.security import UserRole, hash_password, create_access_token

client = TestClient(app)


def make_auth_header(user_id: str, role) -> dict:
    role_str = role.value if hasattr(role, "value") else str(role)
    token = create_access_token({"sub": str(user_id), "role": role_str})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seed_test_data():
    db = SessionLocal()

    # Create Departments
    dept1 = Department(
        name="Ministry of Jal Shakti",
        code="MJS",
        ministry="Ministry of Jal Shakti",
        contact_email="jal@gov.in",
        description="Water resources",
    )
    dept2 = Department(
        name="Ministry of Road Transport",
        code="MoRTH",
        ministry="Ministry of Road Transport and Highways",
        contact_email="transport@gov.in",
        description="Highways",
    )
    db.add_all([dept1, dept2])
    db.flush()

    # Create Users
    gov1 = User(
        email="gov1@mjs.gov.in",
        password_hash=hash_password("Pass123!"),
        full_name="Rajesh Sharma",
        role=UserRole.GOVERNMENT,
        department_id=dept1.id,
        is_active=True,
    )
    gov2 = User(
        email="gov2@morth.gov.in",
        password_hash=hash_password("Pass123!"),
        full_name="Suresh Verma",
        role=UserRole.GOVERNMENT,
        department_id=dept2.id,
        is_active=True,
    )
    admin = User(
        email="admin@gov.in",
        password_hash=hash_password("Pass123!"),
        full_name="Admin Officer",
        role=UserRole.ADMIN,
        is_active=True,
    )
    st_user1 = User(
        email="founder1@watertech.io",
        password_hash=hash_password("Pass123!"),
        full_name="Anita Roy",
        role=UserRole.STARTUP,
        is_active=True,
    )
    st_user2 = User(
        email="founder2@traffictech.io",
        password_hash=hash_password("Pass123!"),
        full_name="Karan Dave",
        role=UserRole.STARTUP,
        is_active=True,
    )
    db.add_all([gov1, gov2, admin, st_user1, st_user2])
    db.flush()

    # Create Startups
    startup1 = Startup(
        user_id=st_user1.id,
        company_name="HydroTech Solutions",
        dpiit_number="DPIIT-0011",
        stage="MVP",
    )
    startup2 = Startup(
        user_id=st_user2.id,
        company_name="TrafficFlow Labs",
        dpiit_number="DPIIT-0022",
        stage="GROWTH",
    )
    db.add_all([startup1, startup2])
    db.flush()

    st_user1.startup_id = startup1.id
    st_user2.startup_id = startup2.id
    db.flush()

    # Create Challenges
    ch1 = Challenge(
        challenge_code="CH-2026-001",
        title="Urban Water Leak Detection",
        problem_statement="High water loss in distribution pipelines.",
        desired_outcome="Reduce non-revenue water loss by 40%.",
        domain="WaterTech",
        department_id=dept1.id,
        created_by=gov1.id,
    )
    db.add(ch1)
    db.flush()

    # Create Applications
    app_draft = Application(
        application_code="APP-2026-DRAFT",
        challenge_id=ch1.id,
        startup_id=startup1.id,
        submitted_by=st_user1.id,
        status="DRAFT",
        proposal_title="Draft Solution",
    )
    app_shortlisted = Application(
        application_code="APP-2026-SHORTLISTED",
        challenge_id=ch1.id,
        startup_id=startup1.id,
        submitted_by=st_user1.id,
        status="SHORTLISTED",
        proposal_title="HydroTech Leak Pinpoint Matrix",
        requested_budget=800000.0,
        timeline_days=90,
    )
    db.add_all([app_draft, app_shortlisted])
    db.commit()

    context = {
        "dept1_id": str(dept1.id),
        "dept2_id": str(dept2.id),
        "gov1_headers": make_auth_header(gov1.id, gov1.role),
        "gov2_headers": make_auth_header(gov2.id, gov2.role),
        "admin_headers": make_auth_header(admin.id, admin.role),
        "st1_headers": make_auth_header(st_user1.id, st_user1.role),
        "st2_headers": make_auth_header(st_user2.id, st_user2.role),
        "app_draft_id": str(app_draft.id),
        "app_shortlisted_id": str(app_shortlisted.id),
    }
    db.close()
    return context


def test_create_pilot_validation_and_code_generation(seed_test_data):
    data = seed_test_data
    gov_headers = data["gov1_headers"]

    # 1. Attempt creating pilot from DRAFT application (Should fail with 400)
    fail_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_draft_id"],
            "pilot_title": "Invalid Pilot From Draft",
        },
    )
    assert fail_res.status_code == 400
    assert "Only shortlisted applications" in fail_res.json()["detail"]

    # 2. Successfully create pilot from SHORTLISTED application
    create_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Delhi Jal Board Hydro Matrix Pilot",
            "pilot_location": "Delhi Cantt Distribution Sector 4",
            "pilot_budget": 800000.0,
            "duration_days": 90,
            "milestones": [
                {
                    "sequence_number": 1,
                    "title": "Baseline Sensor Calibration",
                    "weight": 50.0,
                },
                {
                    "sequence_number": 2,
                    "title": "Live Leak Detection Run",
                    "weight": 50.0,
                },
            ],
        },
    )
    assert create_res.status_code == 201
    p_data = create_res.json()
    assert p_data["pilot_code"].startswith("PILOT-")
    assert p_data["status"] == "PLANNING"
    assert p_data["approval_status"] == "PENDING"
    assert p_data["success_status"] == "NOT_ASSESSED"
    assert len(p_data["milestones"]) == 2

    # 3. Attempting duplicate pilot for same application should fail (400)
    dup_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Duplicate Pilot Attempt",
        },
    )
    assert dup_res.status_code == 400


def test_object_level_authorization(seed_test_data):
    data = seed_test_data
    gov1_headers = data["gov1_headers"]
    gov2_headers = data["gov2_headers"]
    st1_headers = data["st1_headers"]
    st2_headers = data["st2_headers"]
    admin_headers = data["admin_headers"]

    # Create pilot under dept1 & startup1
    create_res = client.post(
        "/api/v1/government/pilots",
        headers=gov1_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Auth Test Pilot",
            "pilot_budget": 500000.0,
        },
    )
    pilot_id = create_res.json()["id"]

    # Gov1 (Owning Department) can view
    assert client.get(f"/api/v1/government/pilots/{pilot_id}", headers=gov1_headers).status_code == 200

    # Gov2 (Different Department) is FORBIDDEN (403)
    assert client.get(f"/api/v1/government/pilots/{pilot_id}", headers=gov2_headers).status_code == 403

    # Startup1 (Owning Startup) can view
    assert client.get(f"/api/v1/startup/pilots/{pilot_id}", headers=st1_headers).status_code == 200

    # Startup2 (Unrelated Startup) is FORBIDDEN (403)
    assert client.get(f"/api/v1/startup/pilots/{pilot_id}", headers=st2_headers).status_code == 403

    # Admin has universal access
    assert client.get(f"/api/v1/government/pilots/{pilot_id}", headers=admin_headers).status_code == 200


def test_milestone_weights_validation_and_start_pilot(seed_test_data):
    data = seed_test_data
    gov_headers = data["gov1_headers"]

    # Create pilot with 1 milestone of weight 40%
    create_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Weight Validation Pilot",
            "milestones": [
                {
                    "sequence_number": 1,
                    "title": "Phase 1 Setup",
                    "weight": 40.0,
                }
            ],
        },
    )
    pilot_id = create_res.json()["id"]

    # Attempting to start pilot when weights total only 40% must fail
    start_fail = client.post(
        f"/api/v1/government/pilots/{pilot_id}/actions",
        headers=gov_headers,
        json={"action": "START"},
    )
    assert start_fail.status_code == 400
    assert "must total exactly 100.0%" in start_fail.json()["detail"]

    # Attempting to add a milestone with 70% weight (40 + 70 = 110%) must fail
    add_fail = client.post(
        f"/api/v1/government/pilots/{pilot_id}/milestones",
        headers=gov_headers,
        json={
            "sequence_number": 2,
            "title": "Phase 2 Deployment",
            "weight": 70.0,
        },
    )
    assert add_fail.status_code == 400
    assert "would exceed 100%" in add_fail.json()["detail"]

    # Add remaining milestone of 60% weight (40 + 60 = 100%)
    add_ok = client.post(
        f"/api/v1/government/pilots/{pilot_id}/milestones",
        headers=gov_headers,
        json={
            "sequence_number": 2,
            "title": "Phase 2 Deployment",
            "weight": 60.0,
        },
    )
    assert add_ok.status_code == 201

    # Now starting pilot must succeed
    start_ok = client.post(
        f"/api/v1/government/pilots/{pilot_id}/actions",
        headers=gov_headers,
        json={"action": "START"},
    )
    assert start_ok.status_code == 200
    assert start_ok.json()["status"] == "ACTIVE"
    assert start_ok.json()["approval_status"] == "APPROVED"


def test_deliverable_upload_versioning_and_review(seed_test_data):
    data = seed_test_data
    gov_headers = data["gov1_headers"]
    st1_headers = data["st1_headers"]

    # Create active pilot with 2 milestones (50% each)
    create_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Deliverables & Review Pilot",
            "milestones": [
                {
                    "sequence_number": 1,
                    "title": "Telemetry Integration",
                    "weight": 50.0,
                },
                {
                    "sequence_number": 2,
                    "title": "Field Validation",
                    "weight": 50.0,
                },
            ],
        },
    )
    pilot_id = create_res.json()["id"]
    m1_id = create_res.json()["milestones"][0]["id"]
    m2_id = create_res.json()["milestones"][1]["id"]

    # Start pilot
    client.post(f"/api/v1/government/pilots/{pilot_id}/actions", headers=gov_headers, json={"action": "START"})

    # 1. Startup uploads deliverable v1 for M1
    file_bytes = b"%PDF-1.4 Mock Deliverable v1 content for test"
    res_upload_v1 = client.post(
        f"/api/v1/startup/pilots/{pilot_id}/milestones/{m1_id}/deliverables",
        headers=st1_headers,
        data={"title": "Telemetry Log v1", "description": "First version proof"},
        files={"file": ("telemetry_v1.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert res_upload_v1.status_code == 201
    d1 = res_upload_v1.json()
    assert d1["submission_version"] == 1
    assert d1["status"] == "SUBMITTED"
    d1_id = d1["id"]

    # 2. Government rejects deliverable v1
    res_review_v1 = client.post(
        f"/api/v1/government/pilots/{pilot_id}/deliverables/{d1_id}/review",
        headers=gov_headers,
        json={"action": "REJECT", "review_comments": "Missing calibration timestamps"},
    )
    assert res_review_v1.status_code == 200
    assert res_review_v1.json()["status"] == "REJECTED"

    # 3. Startup uploads deliverable v2 (Should automatically increment version to 2)
    file_bytes_v2 = b"%PDF-1.4 Mock Deliverable v2 with corrected timestamps"
    res_upload_v2 = client.post(
        f"/api/v1/startup/pilots/{pilot_id}/milestones/{m1_id}/deliverables",
        headers=st1_headers,
        data={"title": "Telemetry Log v2", "description": "Corrected calibration timestamps"},
        files={"file": ("telemetry_v2.pdf", io.BytesIO(file_bytes_v2), "application/pdf")},
    )
    assert res_upload_v2.status_code == 201
    d2 = res_upload_v2.json()
    assert d2["submission_version"] == 2
    assert d2["status"] == "SUBMITTED"
    d2_id = d2["id"]

    # 4. Government accepts deliverable v2
    res_review_v2 = client.post(
        f"/api/v1/government/pilots/{pilot_id}/deliverables/{d2_id}/review",
        headers=gov_headers,
        json={"action": "ACCEPT", "review_comments": "Timestamps verified satisfactorily."},
    )
    assert res_review_v2.status_code == 200
    assert res_review_v2.json()["status"] == "ACCEPTED"

    # 5. Government formally accepts Milestone 1
    res_m1_acc = client.post(
        f"/api/v1/government/pilots/{pilot_id}/milestones/{m1_id}/review",
        headers=gov_headers,
        json={"action": "ACCEPT"},
    )
    assert res_m1_acc.status_code == 200
    assert res_m1_acc.json()["status"] == "ACCEPTED"
    assert res_m1_acc.json()["completion_percentage"] == 100.0

    # 6. Verify pilot progress: 50% * 100% = 50.0%
    p_check = client.get(f"/api/v1/government/pilots/{pilot_id}", headers=gov_headers).json()
    assert p_check["pilot_progress"] == 50.0


def test_pilot_completion_requires_all_milestones_and_preserves_not_assessed(seed_test_data):
    data = seed_test_data
    gov_headers = data["gov1_headers"]

    create_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Completion Test Pilot",
            "milestones": [
                {"sequence_number": 1, "title": "Milestone A", "weight": 50.0},
                {"sequence_number": 2, "title": "Milestone B", "weight": 50.0},
            ],
        },
    )
    pilot_id = create_res.json()["id"]
    m1_id = create_res.json()["milestones"][0]["id"]
    m2_id = create_res.json()["milestones"][1]["id"]

    # Start pilot
    client.post(f"/api/v1/government/pilots/{pilot_id}/actions", headers=gov_headers, json={"action": "START"})

    # Attempting to complete pilot when milestones are uncompleted must fail (400)
    comp_fail = client.post(
        f"/api/v1/government/pilots/{pilot_id}/actions",
        headers=gov_headers,
        json={"action": "COMPLETE"},
    )
    assert comp_fail.status_code == 400
    assert "All milestones must be formally accepted or completed" in comp_fail.json()["detail"]

    # Accept both milestones
    client.post(f"/api/v1/government/pilots/{pilot_id}/milestones/{m1_id}/review", headers=gov_headers, json={"action": "ACCEPT"})
    client.post(f"/api/v1/government/pilots/{pilot_id}/milestones/{m2_id}/review", headers=gov_headers, json={"action": "ACCEPT"})

    # Completing pilot must now succeed
    comp_ok = client.post(
        f"/api/v1/government/pilots/{pilot_id}/actions",
        headers=gov_headers,
        json={"action": "COMPLETE"},
    )
    assert comp_ok.status_code == 200
    p_final = comp_ok.json()
    assert p_final["status"] == "COMPLETED"
    # CRITICAL: success_status strictly remains NOT_ASSESSED!
    assert p_final["success_status"] == "NOT_ASSESSED"
    assert p_final["pilot_progress"] == 100.0


def test_pilot_cancellation_requires_reason(seed_test_data):
    data = seed_test_data
    gov_headers = data["gov1_headers"]

    create_res = client.post(
        "/api/v1/government/pilots",
        headers=gov_headers,
        json={
            "application_id": data["app_shortlisted_id"],
            "pilot_title": "Cancellation Test Pilot",
        },
    )
    pilot_id = create_res.json()["id"]

    # Cancellation without reason fails (400)
    fail_res = client.post(
        f"/api/v1/government/pilots/{pilot_id}/actions",
        headers=gov_headers,
        json={"action": "CANCEL"},
    )
    assert fail_res.status_code == 400
    assert "cancellation reason is mandatory" in fail_res.json()["detail"]

    # Cancellation with reason succeeds
    cancel_res = client.post(
        f"/api/v1/government/pilots/{pilot_id}/actions",
        headers=gov_headers,
        json={"action": "CANCEL", "reason": "Departmental operational budget reallocated."},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
    assert cancel_res.json()["cancellation_reason"] == "Departmental operational budget reallocated."
