import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure a clean database schema for each test."""
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
    assert res.status_code == 201
    return res.json()["access_token"]


def test_challenge_creation_and_proposal_submission_flow():
    # 1. Register Government Official
    gov_token = register_user(
        "GOVERNMENT",
        "nodal@transport.gov.in",
        department_name="Ministry of Road Transport",
        department_code="MORTH-01",
    )

    # 2. Register DPIIT Startup
    startup_token = register_user(
        "STARTUP",
        "founder@trafficsense.ai",
        company_name="TrafficSense AI",
        dpiit_number="DPIIT-99124",
        sector="CivicTech",
    )

    # 3. Government official publishes challenge
    challenge_payload = {
        "title": "Autonomous Traffic Signal Optimization Using Computer Vision",
        "problem_statement": "Urban traffic junctions face heavy peak-hour congestion resulting in high commuter wait times and excessive vehicle emissions.",
        "outcome_definition": "Reduce average junction vehicle wait time by at least 45% using adaptive camera telemetry without hardware road disruption.",
        "target_sector": "CivicTech",
        "budget_estimate": 2000000.0,
        "pilot_duration_months": 4.0,
    }
    create_res = client.post(
        "/api/v1/challenges",
        json=challenge_payload,
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert create_res.status_code == 201
    challenge_data = create_res.json()
    challenge_id = challenge_data["id"]
    assert challenge_data["title"] == challenge_payload["title"]
    assert challenge_data["department_name"] == "Ministry of Road Transport"

    # 4. Startup cannot create a challenge (RBAC 403)
    unauth_create = client.post(
        "/api/v1/challenges",
        json=challenge_payload,
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert unauth_create.status_code == 403

    # 5. Public lists challenges
    list_res = client.get("/api/v1/challenges")
    assert list_res.status_code == 200
    challenges = list_res.json()
    assert len(challenges) == 1
    assert challenges[0]["id"] == challenge_id

    # 6. Startup submits proposal to the challenge
    apply_payload = {
        "proposal_summary": "Edge-computed AI camera integration using existing CCTV feeds to dynamically alter traffic light phasing in real time.",
        "technical_approach": "Our YOLO-v10 multi-lane vehicle queue estimation model runs at 30 FPS on embedded edge gateways at the junction controller.",
        "proposed_solution_trl": "TRL 8",
        "pitch_deck_url": "https://example.gov.in/trafficsense-deck.pdf",
    }
    apply_res = client.post(
        f"/api/v1/challenges/{challenge_id}/apply",
        json=apply_payload,
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert apply_res.status_code == 201
    app_data = apply_res.json()
    assert app_data["challenge_id"] == challenge_id
    assert app_data["status"] == "SUBMITTED"
    assert app_data["proposed_solution_trl"] == "TRL 8"

    # 7. Duplicate proposal is rejected (400 Bad Request)
    dup_res = client.post(
        f"/api/v1/challenges/{challenge_id}/apply",
        json=apply_payload,
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert dup_res.status_code == 400

    # 8. Government officer reviews received proposals
    reviews_res = client.get(
        f"/api/v1/challenges/{challenge_id}/applications",
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert reviews_res.status_code == 200
    apps_list = reviews_res.json()
    assert len(apps_list) == 1
    assert apps_list[0]["company_name"] == "TrafficSense AI"

    # 9. Startup checks their submitted proposals
    my_apps_res = client.get(
        "/api/v1/challenges/my-applications",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert my_apps_res.status_code == 200
    my_apps = my_apps_res.json()
    assert len(my_apps) == 1
    assert my_apps[0]["challenge_id"] == challenge_id
