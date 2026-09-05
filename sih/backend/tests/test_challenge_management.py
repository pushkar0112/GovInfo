from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.department import Department
from app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure a clean database schema for each test run."""
    Base.metadata.drop_all(bind=engine)
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


# ==============================================================================
# Tests
# ==============================================================================

def test_government_create_draft_challenge_and_rbac_restrictions():
    # 1. Register users for each role
    gov_token = register_user("GOVERNMENT", "gov1@water.gov.in", department_name="Water Board", department_code="WB-01")
    startup_token = register_user("STARTUP", "startup1@dev.in", company_name="CivicAI Ltd")
    expert_token = register_user("EXPERT", "expert1@iit.ac.in")
    validator_token = register_user("VALIDATOR", "val1@stqc.gov.in")
    procure_token = register_user("PROCUREMENT_OFFICER", "proc1@gem.gov.in")

    challenge_payload = {
        "title": "Acoustic Non-Revenue Water Leakage Detection",
        "problem_statement": "Subsurface pipe ruptures cause severe potable water loss across municipal networks without road digging.",
        "desired_outcome": "Reduce non-revenue water leakage by 20% across 50 km feeder network.",
        "domain": "CivicTech",
        "budget_min": 1000000.0,
        "budget_max": 2000000.0,
        "pilot_duration_days": 90,
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "eligibility_requirements": "DPIIT-recognized Indian startups with TRL 6 prototype.",
    }

    # 2. Government creates challenge as DRAFT
    res = client.post("/api/v1/challenges", json=challenge_payload, headers={"Authorization": f"Bearer {gov_token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "DRAFT"
    assert data["challenge_code"].startswith("GI-")
    assert data["title"] == challenge_payload["title"]
    challenge_id = data["id"]

    # 3. Non-government roles cannot create challenge (403 Forbidden)
    for token, role_name in [
        (startup_token, "STARTUP"),
        (expert_token, "EXPERT"),
        (validator_token, "VALIDATOR"),
        (procure_token, "PROCUREMENT_OFFICER"),
    ]:
        unauth_res = client.post("/api/v1/challenges", json=challenge_payload, headers={"Authorization": f"Bearer {token}"})
        assert unauth_res.status_code == 403, f"{role_name} was unexpectedly allowed to create challenge"

    # 4. Draft is NOT visible in Startup challenge list
    startup_list = client.get("/api/v1/challenges", headers={"Authorization": f"Bearer {startup_token}"})
    assert startup_list.status_code == 200
    assert len(startup_list.json()) == 0

    # 5. Startup cannot view Draft challenge directly (403 Forbidden)
    startup_detail = client.get(f"/api/v1/challenges/{challenge_id}", headers={"Authorization": f"Bearer {startup_token}"})
    assert startup_detail.status_code in [403, 404]


def test_department_isolation_and_admin_management():
    # Government 1 from Dept 1
    gov1_token = register_user("GOVERNMENT", "officer1@morth.gov.in", department_name="Ministry of Road Transport", department_code="MORTH-01")
    # Government 2 from Dept 2
    gov2_token = register_user("GOVERNMENT", "officer2@health.gov.in", department_name="Ministry of Health", department_code="MOH-01")

    db = SessionLocal()
    admin = User(
        email="admin@govinnovate.gov.in",
        password_hash="fakehash",
        full_name="Platform Admin",
        role="ADMIN",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    admin_id = admin.id
    admin_email = admin.email
    db.close()
    
    from app.core.security import create_access_token
    admin_token = create_access_token({"sub": admin_id, "email": admin_email, "role": "ADMIN"})

    # Gov1 creates draft
    create_res = client.post(
        "/api/v1/challenges",
        json={
            "title": "Smart Traffic Optimization Corridor",
            "problem_statement": "Vehicular queues exceed 30 minutes at peak hours at major intersections.",
            "desired_outcome": "Reduce junction transit delay by 35%.",
            "domain": "CivicTech",
            "budget_min": 500000.0,
            "budget_max": 1500000.0,
        },
        headers={"Authorization": f"Bearer {gov1_token}"},
    )
    assert create_res.status_code == 201
    ch_id = create_res.json()["id"]

    # Gov2 cannot edit Gov1's challenge (403 Forbidden)
    gov2_update = client.put(
        f"/api/v1/challenges/{ch_id}",
        json={"title": "Hacked Title by Other Department"},
        headers={"Authorization": f"Bearer {gov2_token}"},
    )
    assert gov2_update.status_code == 403

    # Admin CAN edit Gov1's challenge
    admin_update = client.put(
        f"/api/v1/challenges/{ch_id}",
        json={"title": "Admin Verified Traffic Optimization"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_update.status_code == 200
    assert admin_update.json()["title"] == "Admin Verified Traffic Optimization"


def test_pre_publish_validation_and_publishing_lifecycle():
    gov_token = register_user("GOVERNMENT", "nodal@urban.gov.in", department_name="Urban Affairs", department_code="MOHUA-01")
    startup_token = register_user("STARTUP", "tech@cleanair.in", company_name="CleanAir Solutions")

    # 1. Create incomplete challenge
    create_res = client.post(
        "/api/v1/challenges",
        json={
            "title": "Urban Particulate Matter Reduction",
            "problem_statement": "Air quality index exceeds 350 during winter months across urban hubs.",
            "desired_outcome": "Lower localized PM2.5 levels by 30%.",
            "domain": "CleanTech",
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert create_res.status_code == 201
    ch_id = create_res.json()["id"]

    # 2. Attempt to publish incomplete challenge -> Rejected (422 Unprocessable Entity)
    pub_fail = client.post(f"/api/v1/challenges/{ch_id}/publish", headers={"Authorization": f"Bearer {gov_token}"})
    assert pub_fail.status_code == 422
    err = pub_fail.json()
    assert "missing_requirements" in err["detail"]

    # 3. Add required fields: Budget, Deadline, Duration, Eligibility
    deadline = (datetime.now(timezone.utc) + timedelta(days=45)).isoformat()
    client.put(
        f"/api/v1/challenges/{ch_id}",
        json={
            "budget_min": 1000000.0,
            "budget_max": 2500000.0,
            "pilot_duration_days": 120,
            "application_deadline": deadline,
            "eligibility_requirements": "DPIIT recognized entity with outdoor air purification prototype.",
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )

    # Still missing KPI -> publish rejected
    pub_kpi_fail = client.post(f"/api/v1/challenges/{ch_id}/publish", headers={"Authorization": f"Bearer {gov_token}"})
    assert pub_kpi_fail.status_code == 422

    # 4. Attach KPI
    kpi_res = client.post(
        f"/api/v1/challenges/{ch_id}/kpis",
        json={
            "name": "PM2.5 concentration reduction",
            "description": "Continuous localized ambient air quality sensor readings.",
            "measurement_unit": "%",
            "baseline_value": 350.0,
            "target_value": 245.0,
            "measurement_method": "CPCB approved continuous ambient air monitoring stations.",
            "weight": 50.0,
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert kpi_res.status_code == 201

    # 5. Now publish succeeds!
    pub_success = client.post(f"/api/v1/challenges/{ch_id}/publish", headers={"Authorization": f"Bearer {gov_token}"})
    assert pub_success.status_code == 200
    pub_data = pub_success.json()
    assert pub_data["status"] == "PUBLISHED"
    assert pub_data["published_at"] is not None

    # 6. Published challenge is now visible to Startup in list & detail
    startup_catalog = client.get("/api/v1/challenges", headers={"Authorization": f"Bearer {startup_token}"})
    assert startup_catalog.status_code == 200
    challenges = startup_catalog.json()
    assert len(challenges) == 1
    assert challenges[0]["id"] == ch_id

    startup_view = client.get(f"/api/v1/challenges/{ch_id}", headers={"Authorization": f"Bearer {startup_token}"})
    assert startup_view.status_code == 200
    assert startup_view.json()["title"] == "Urban Particulate Matter Reduction"

    # 7. Close challenge
    close_res = client.post(f"/api/v1/challenges/{ch_id}/close", headers={"Authorization": f"Bearer {gov_token}"})
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 8. Cancel challenge -> Hidden from startup
    cancel_res = client.post(f"/api/v1/challenges/{ch_id}/cancel", headers={"Authorization": f"Bearer {gov_token}"})
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    startup_catalog_after = client.get("/api/v1/challenges", headers={"Authorization": f"Bearer {startup_token}"})
    assert len(startup_catalog_after.json()) == 0


def test_kpi_crud_and_budget_validation():
    gov_token = register_user("GOVERNMENT", "officer@power.gov.in", department_name="Ministry of Power", department_code="MOP-01")

    # 1. Budget min > max validation fails
    invalid_budget = client.post(
        "/api/v1/challenges",
        json={
            "title": "Smart Power Grid Optimization",
            "problem_statement": "Distribution loss exceeds 22% on agricultural feeders.",
            "desired_outcome": "Reduce aggregate technical and commercial (AT&C) loss.",
            "budget_min": 3000000.0,
            "budget_max": 1000000.0,  # Invalid: min > max
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert invalid_budget.status_code == 422

    # 2. Create valid challenge with initial KPIs
    create_res = client.post(
        "/api/v1/challenges",
        json={
            "title": "Smart Power Grid Optimization",
            "problem_statement": "Distribution loss exceeds 22% on agricultural feeders.",
            "desired_outcome": "Reduce aggregate technical and commercial (AT&C) loss by 8%.",
            "domain": "CleanTech",
            "budget_min": 1000000.0,
            "budget_max": 3000000.0,
            "kpis": [
                {
                    "name": "AT&C Loss Reduction",
                    "measurement_unit": "%",
                    "baseline_value": 22.0,
                    "target_value": 14.0,
                    "weight": 60.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert create_res.status_code == 201
    ch = create_res.json()
    ch_id = ch["id"]
    assert len(ch["kpis"]) == 1
    kpi_id = ch["kpis"][0]["id"]

    # 3. Add second KPI
    kpi2 = client.post(
        f"/api/v1/challenges/{ch_id}/kpis",
        json={
            "name": "Transformer Outage Downtime",
            "measurement_unit": "hours",
            "baseline_value": 18.0,
            "target_value": 2.0,
            "weight": 40.0,
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert kpi2.status_code == 201
    kpi2_id = kpi2.json()["id"]

    # 4. List KPIs
    kpi_list = client.get(f"/api/v1/challenges/{ch_id}/kpis")
    assert kpi_list.status_code == 200
    assert len(kpi_list.json()) == 2

    # 5. Update KPI
    update_kpi = client.put(
        f"/api/v1/challenges/{ch_id}/kpis/{kpi_id}",
        json={"target_value": 12.5, "description": "Verified through smart energy meters."},
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert update_kpi.status_code == 200
    assert float(update_kpi.json()["target_value"]) == 12.5

    # 6. Delete KPI
    del_kpi = client.delete(f"/api/v1/challenges/{ch_id}/kpis/{kpi2_id}", headers={"Authorization": f"Bearer {gov_token}"})
    assert del_kpi.status_code == 200

    kpi_list_after = client.get(f"/api/v1/challenges/{ch_id}/kpis")
    assert len(kpi_list_after.json()) == 1
