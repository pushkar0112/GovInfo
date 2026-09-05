from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.department import Department
from app.models.challenge import Challenge, ChallengeStatus
from app.models.startup import Startup
from app.models.application import Application, ApplicationStatus

import sqlalchemy as sa

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure a clean database schema for each test run."""
    with engine.connect() as conn:
        conn.execute(sa.text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    yield


def register_user(role: str, email: str, **kwargs):
    payload = {
        "email": email,
        "password": "SecurePassword123!",
        "full_name": f"Test {role} User",
        "role": role,
        **kwargs,
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201, f"Failed to register {email}: {res.json()}"
    return res.json()["access_token"]


def create_department(name: str, code: str) -> str:
    db = SessionLocal()
    dept = Department(
        name=name,
        code=code,
        ministry=name,
        contact_email=f"{code.lower()}@govinnovate.gov.in",
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    dept_id = dept.id
    db.close()
    return dept_id


def create_challenge_helper(gov_token: str, dept_id: str, title: str, status: str = "PUBLISHED", deadline_offset_days: int = 30) -> str:
    headers = {"Authorization": f"Bearer {gov_token}"}
    deadline = (datetime.now(timezone.utc) + timedelta(days=deadline_offset_days)).isoformat()
    payload = {
        "title": title,
        "problem_statement": "Aging civic infrastructure causes massive operational losses across municipal wards.",
        "desired_outcome": "Automated telemetry reducing response time from days to under 30 minutes.",
        "domain": "WaterTech",
        "geographical_scope": "City-wide",
        "budget_min": 1000000.0,
        "budget_max": 2500000.0,
        "pilot_duration_days": 90,
        "application_deadline": deadline,
        "eligibility_requirements": "Open to DPIIT-recognized startups with MVP or Production ready technology.",
        "kpis": [
            {
                "kpi_name": "Leakage Detection Speed",
                "target_value": 90.0,
                "baseline_value": 40.0,
                "unit": "%",
                "measurement_methodology": "IoT sensor telemetry",
            }
        ],
    }
    res = client.post("/api/v1/challenges", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed to create challenge: {res.json()}"
    ch_id = res.json()["id"]

    if status == "PUBLISHED":
        pub_res = client.post(f"/api/v1/challenges/{ch_id}/publish", headers=headers)
        assert pub_res.status_code == 200, f"Failed to publish challenge: {pub_res.json()}"

    return ch_id


# ==============================================================================
# Tests for Step 4: Startup Discovery & Challenge Application
# ==============================================================================

def test_startup_profile_crud_and_completeness():
    startup_token = register_user("STARTUP", "founder@aquasense.io", organization_name="AquaSense Labs")
    headers = {"Authorization": f"Bearer {startup_token}"}

    # 1. Get initial profile
    res = client.get("/api/v1/startups/profile", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["startup_name"] == "AquaSense Labs"
    initial_completeness = data["completeness_percentage"]

    # 2. Update profile with detailed information
    update_payload = {
        "legal_name": "AquaSense Technologies Pvt Ltd",
        "website": "https://aquasense.io",
        "headquarters": "Bengaluru, Karnataka",
        "founded_year": 2022,
        "team_size": "11-50",
        "dpiit_recognition_number": "DPIIT-89210",
        "recognition_status": "VERIFIED",
        "description": "AquaSense builds acoustic telemetry sensors for municipal water pipe bursts.",
        "technology_domains": ["WaterTech", "IoT"],
        "solution_categories": ["Smart Metering", "Edge Anomaly Detection"],
        "product_stage": "MVP",
        "operating_regions": ["Karnataka", "National"],
        "previous_deployments": "50 sensor pilot in Hubbali municipal corporation.",
        "cybersecurity_certifications": "CERT-In empaneled security audit 2025",
    }
    update_res = client.put("/api/v1/startups/profile", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["dpiit_recognition_number"] == "DPIIT-89210"
    assert updated_data["recognition_status"] == "VERIFIED"
    assert updated_data["completeness_percentage"] > initial_completeness
    assert updated_data["completeness_percentage"] >= 80


def test_startup_discovery_filters_and_visibility():
    dept1 = create_department("Delhi Jal Board", "DJB-01")
    gov_token = register_user("GOVERNMENT", "officer@djb.gov.in", department_name="Delhi Jal Board", department_code="DJB-01")
    startup_token = register_user("STARTUP", "startup@iot.in", company_name="CivicAI")
    headers_startup = {"Authorization": f"Bearer {startup_token}"}

    # Create one published challenge and one draft challenge
    pub_ch_id = create_challenge_helper(gov_token, dept1, "Smart Water Leak Detection", status="PUBLISHED")
    draft_ch_id = create_challenge_helper(gov_token, dept1, "Internal Unreleased Challenge", status="DRAFT")

    # 1. Startup discovers challenges
    res = client.get("/api/v1/startups/challenges", headers=headers_startup)
    assert res.status_code == 200
    catalog = res.json()["challenges"]
    catalog_ids = [c["id"] for c in catalog]

    assert pub_ch_id in catalog_ids
    assert draft_ch_id not in catalog_ids  # Draft MUST NOT be visible

    # 2. Database search and domain filtering
    search_res = client.get("/api/v1/startups/challenges?search=Water", headers=headers_startup)
    assert search_res.status_code == 200
    assert len(search_res.json()["challenges"]) >= 1

    empty_res = client.get("/api/v1/startups/challenges?search=NonExistentTermXYZ", headers=headers_startup)
    assert empty_res.status_code == 200
    assert len(empty_res.json()["challenges"]) == 0


def test_eligibility_screening_engine():
    dept = create_department("Ministry of Health", "MOH-01")
    gov_token = register_user("GOVERNMENT", "health_gov@moh.gov.in", department_name="Ministry of Health", department_code="MOH-01")
    startup_token = register_user("STARTUP", "early_founder@biotech.io", company_name="EarlyBio")
    headers = {"Authorization": f"Bearer {startup_token}"}

    ch_id = create_challenge_helper(gov_token, dept, "Hospital Triage AI", status="PUBLISHED")

    # Initially, startup has default MVP but not verified DPIIT
    check_res = client.post(f"/api/v1/startups/challenges/{ch_id}/eligibility-check", headers=headers)
    assert check_res.status_code == 200
    data = check_res.json()
    assert "mandatory_criteria" in data
    assert "preferred_criteria" in data

    # Update startup to IDEA stage -> should fail minimum product stage
    client.put("/api/v1/startups/profile", json={"product_stage": "IDEA"}, headers=headers)
    fail_res = client.post(f"/api/v1/startups/challenges/{ch_id}/eligibility-check", headers=headers)
    assert fail_res.status_code == 200
    assert fail_res.json()["is_eligible"] is False
    assert fail_res.json()["overall_status"] == "INELIGIBLE"

    # Fix stage to PRODUCTION and add verified DPIIT -> should be ELIGIBLE
    client.put(
        "/api/v1/startups/profile",
        json={
            "product_stage": "PRODUCTION",
            "dpiit_recognition_number": "DPIIT-44332",
            "recognition_status": "VERIFIED",
            "description": "Production ready diagnostic AI solution with edge inference.",
            "technology_domains": ["HealthTech", "AI"],
            "legal_name": "EarlyBio Health Solutions Pvt Ltd",
            "headquarters": "New Delhi",
            "founded_year": 2021,
            "team_size": "11-50",
            "website": "https://earlybio.in",
        },
        headers=headers,
    )
    pass_res = client.post(f"/api/v1/startups/challenges/{ch_id}/eligibility-check", headers=headers)
    assert pass_res.status_code == 200
    assert pass_res.json()["is_eligible"] is True
    assert pass_res.json()["overall_status"] == "ELIGIBLE"


def test_application_lifecycle_draft_submit_duplicate_and_deadlines():
    dept = create_department("Urban Development", "UD-01")
    gov_token = register_user("GOVERNMENT", "urban_officer@ud.gov.in", department_name="Urban Development", department_code="UD-01")
    startup_token = register_user("STARTUP", "app_dev@tech.io", company_name="CivicGrid")
    headers = {"Authorization": f"Bearer {startup_token}"}

    ch_id = create_challenge_helper(gov_token, dept, "Traffic Flow Smart Grid", status="PUBLISHED")

    # Complete startup profile
    client.put(
        "/api/v1/startups/profile",
        json={
            "dpiit_recognition_number": "DPIIT-99112",
            "recognition_status": "VERIFIED",
            "product_stage": "MVP",
            "technology_domains": ["WaterTech", "CivicTech"],
        },
        headers=headers,
    )

    # 1. Save Application as DRAFT
    draft_payload = {
        "challenge_id": ch_id,
        "proposal_title": "Edge IoT Traffic Optimization Grid",
        "executive_summary": "Preliminary summary for adaptive signal corridor deployment.",
        "requested_budget": 1500000.0,
        "timeline_days": 90,
    }
    draft_res = client.post("/api/v1/applications", json=draft_payload, headers=headers)
    assert draft_res.status_code == 201
    app_data = draft_res.json()
    app_id = app_data["id"]
    assert app_data["status"] == "DRAFT"
    assert app_data["application_code"].startswith("APP-2026-")

    # 2. Saving draft again for the same challenge should update the existing draft (not duplicate)
    draft_res2 = client.post(
        "/api/v1/applications",
        json={"challenge_id": ch_id, "proposal_title": "Updated Title for Draft Grid"},
        headers=headers,
    )
    assert draft_res2.status_code == 201
    assert draft_res2.json()["id"] == app_id
    assert draft_res2.json()["proposal_title"] == "Updated Title for Draft Grid"

    # 3. Incomplete submission should be rejected
    incomplete_submit = client.post(f"/api/v1/applications/{app_id}/submit", headers=headers)
    assert incomplete_submit.status_code == 400
    assert "Incomplete application" in incomplete_submit.json()["detail"]

    # 4. Valid official submission
    submit_payload = {
        "challenge_id": ch_id,
        "proposal_title": "Edge IoT Traffic Optimization Grid System",
        "executive_summary": "Complete end-to-end adaptive signal timing engine deployed at corridor intersections.",
        "problem_understanding": "Static cycle timers create heavy idling delays and severe intersection bottlenecks.",
        "proposed_solution": "Decentralized edge compute nodes paired with existing municipal signal controllers.",
        "technical_approach": "YOLOv8 vehicle detection coupled with reinforcement learning dynamic light phasing.",
        "expected_outcomes": "Achieves 25% lower transit latency and 30% reduction in vehicle emissions during rush hours.",
        "implementation_plan": "Phase 1: Sensor installation. Phase 2: Signal controller interfacing. Phase 3: Live trial.",
        "pilot_plan": "Deploy across 6 high-density intersections on Ring Road for 90 days.",
        "timeline_days": 90,
        "requested_budget": 1800000.0,
    }
    submit_res = client.post(f"/api/v1/applications/{app_id}/submit", json=submit_payload, headers=headers)
    assert submit_res.status_code == 200
    submitted_app = submit_res.json()
    assert submitted_app["status"] == "SUBMITTED"
    assert submitted_app["submitted_at"] is not None

    # 5. Duplicate Active Application Prevention
    dup_res = client.post(
        "/api/v1/applications",
        json={"challenge_id": ch_id, "proposal_title": "Second Duplicate Application Attempt"},
        headers=headers,
    )
    assert dup_res.status_code == 409
    assert "already have an active application" in dup_res.json()["detail"]


def test_government_inbox_and_status_transitions():
    dept1 = create_department("Renewable Energy", "MNRE-01")
    dept2 = create_department("Border Roads", "BRO-01")

    gov1_token = register_user("GOVERNMENT", "mnre_officer@gov.in", department_name="Renewable Energy", department_code="MNRE-01")
    gov2_token = register_user("GOVERNMENT", "bro_officer@gov.in", department_name="Border Roads", department_code="BRO-01")
    startup_token = register_user("STARTUP", "solar_startup@sun.io", company_name="SunGrid Labs")
    startup_headers = {"Authorization": f"Bearer {startup_token}"}
    gov1_headers = {"Authorization": f"Bearer {gov1_token}"}
    gov2_headers = {"Authorization": f"Bearer {gov2_token}"}

    # Government 1 creates and publishes challenge
    ch_id = create_challenge_helper(gov1_token, dept1, "Rooftop Solar AI Inverter", status="PUBLISHED")

    # Startup submits proposal
    client.put(
        "/api/v1/startups/profile",
        json={"dpiit_recognition_number": "DPIIT-11223", "recognition_status": "VERIFIED", "product_stage": "MVP"},
        headers=startup_headers,
    )
    draft_res = client.post("/api/v1/applications", json={"challenge_id": ch_id}, headers=startup_headers)
    app_id = draft_res.json()["id"]

    submit_payload = {
        "challenge_id": ch_id,
        "proposal_title": "Solar Grid Inverter Micro-Grid Mesh",
        "executive_summary": "High-efficiency micro-inverter with automated islanding and harmonic filtering.",
        "problem_understanding": "Frequent distribution grid voltage fluctuations trip distributed solar generation.",
        "proposed_solution": "Smart inverters modulating active and reactive power dynamically in milliseconds.",
        "technical_approach": "DSP-controlled IGBT switches synchronized with grid frequency telemetry.",
        "expected_outcomes": "Prevents nuisance inverter tripping and stabilizes feeder line voltage by 18%.",
        "implementation_plan": "Month 1: Bench testing. Month 2: Feeder line field trial. Month 3: Power quality audit.",
        "pilot_plan": "Trial deployment on 20 municipal rooftop installations in Connaught Place sector.",
        "timeline_days": 90,
        "requested_budget": 1200000.0,
    }
    client.post(f"/api/v1/applications/{app_id}/submit", json=submit_payload, headers=startup_headers)

    # 1. Government 1 sees application in inbox
    inbox1 = client.get("/api/v1/government/applications", headers=gov1_headers)
    assert inbox1.status_code == 200
    app_ids_inbox1 = [a["id"] for a in inbox1.json()["items"]]
    assert app_id in app_ids_inbox1

    # 2. Government 2 (unrelated department) CANNOT see this application (Department Isolation)
    inbox2 = client.get("/api/v1/government/applications", headers=gov2_headers)
    assert inbox2.status_code == 200
    app_ids_inbox2 = [a["id"] for a in inbox2.json()["items"]]
    assert app_id not in app_ids_inbox2

    # 3. Government 2 CANNOT access detail of unrelated department application (HTTP 403)
    detail_gov2 = client.get(f"/api/v1/government/applications/{app_id}", headers=gov2_headers)
    assert detail_gov2.status_code == 403

    # 4. Government 1 updates status: SUBMITTED -> UNDER_REVIEW
    stat1 = client.post(
        f"/api/v1/government/applications/{app_id}/status",
        json={"status": "UNDER_REVIEW", "review_notes": "Candidate proposal selected for technical screening."},
        headers=gov1_headers,
    )
    assert stat1.status_code == 200
    assert stat1.json()["status"] == "UNDER_REVIEW"

    # 5. Startup sees updated status
    startup_view = client.get(f"/api/v1/applications/{app_id}", headers=startup_headers)
    assert startup_view.status_code == 200
    assert startup_view.json()["status"] == "UNDER_REVIEW"

    # 6. Government 1 shortlists: UNDER_REVIEW -> SHORTLISTED
    stat2 = client.post(
        f"/api/v1/government/applications/{app_id}/status",
        json={"status": "SHORTLISTED", "review_notes": "Shortlisted for expert technical jury."},
        headers=gov1_headers,
    )
    assert stat2.status_code == 200
    assert stat2.json()["status"] == "SHORTLISTED"

    # 7. Another startup CANNOT access this application (HTTP 403)
    other_startup_token = register_user("STARTUP", "other@corp.in", company_name="OtherCorp")
    other_headers = {"Authorization": f"Bearer {other_startup_token}"}
    other_view = client.get(f"/api/v1/applications/{app_id}", headers=other_headers)
    assert other_view.status_code == 403
