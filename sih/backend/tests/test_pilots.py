from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def register_user(role: str, email: str, **kwargs):
    payload = {
        "email": email,
        "password": "SecurePassword123!",
        "full_name": f"User {role}",
        "role": role,
        **kwargs,
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    return res.json()["access_token"]


def test_full_evaluation_and_pilot_tranche_lifecycle():
    # 1. Register stakeholders
    gov_token = register_user(
        "GOVERNMENT",
        "nodal@health.gov.in",
        department_name="National Health Mission",
    )
    startup_token = register_user(
        "STARTUP",
        "founder@medai.io",
        company_name="MedAI Telemetry",
        dpiit_number="DPIIT-77610",
    )
    evaluator_token = register_user(
        "EXPERT_EVALUATOR",
        "evaluator@iit.ac.in",
    )

    # 2. Government posts challenge
    ch_res = client.post(
        "/api/v1/challenges",
        json={
            "title": "Autonomous Clinical Triage at Primary Health Centres",
            "problem_statement": "Acute specialist shortages delay emergency transfers from rural clinics.",
            "outcome_definition": "Reduce triage wait time by 50% and maintain 90% diagnostic accuracy.",
            "target_sector": "HealthTech",
            "budget_estimate": 1500000.0,
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert ch_res.status_code == 201
    challenge_id = ch_res.json()["id"]

    # 3. Startup applies
    app_res = client.post(
        f"/api/v1/challenges/{challenge_id}/apply",
        json={
            "proposal_summary": "Edge-based diagnostic telemetry algorithm running on offline rugged tablets.",
            "technical_approach": "Convolutional vision transformers processing vital sign telemetry locally with cloud sync.",
            "proposed_solution_trl": "TRL 7",
        },
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # 4. Expert Evaluator scores proposal
    eval_res = client.post(
        f"/api/v1/pilots/applications/{app_id}/evaluate",
        json={
            "technical_score": 90.0,
            "operational_score": 85.0,
            "commercial_score": 80.0,
            "evaluator_feedback": "Highly viable architecture suitable for low-connectivity rural health posts.",
            "recommendation": "STRONGLY_RECOMMEND",
        },
        headers={"Authorization": f"Bearer {evaluator_token}"},
    )
    assert eval_res.status_code == 201
    eval_data = eval_res.json()
    # 0.4*90 + 0.3*85 + 0.3*80 = 36 + 25.5 + 24 = 85.5
    assert eval_data["composite_score"] == 85.5
    assert eval_data["recommendation"] == "STRONGLY_RECOMMEND"

    # 5. Government initiates Pilot Sandbox with 2 milestones & 1 KPI
    due_1 = (date.today() + timedelta(days=30)).isoformat()
    due_2 = (date.today() + timedelta(days=60)).isoformat()

    pilot_payload = {
        "application_id": app_id,
        "title": "PHC Rural Tele-Triage Field Sandbox Trial",
        "scope_of_work": "Deploy ruggedized diagnostic tablets in 5 Sub-Divisional Health Centres in Alwar District.",
        "duration_weeks": 12,
        "sandbox_location": "Alwar District Health Centres, Rajasthan",
        "approved_budget": 1500000.0,
        "milestones": [
            {
                "sequence_number": 1,
                "title": "Hardware Provisioning & Baseline Setup",
                "deliverable_description": "Deploy tablets and calibrate baseline telemetry in all 5 PHCs.",
                "tranche_amount": 500000.0,
                "due_date": due_1,
            },
            {
                "sequence_number": 2,
                "title": "1,000 Live Patient Triage Runs",
                "deliverable_description": "Execute 1,000 patient triage assessments with physician log verification.",
                "tranche_amount": 500000.0,
                "due_date": due_2,
            },
        ],
        "kpis": [
            {
                "metric_name": "Triage Wait Time Reduction",
                "baseline_value": 45.0,
                "target_value": 15.0,
                "unit": "minutes",
            }
        ],
    }

    pilot_res = client.post(
        "/api/v1/pilots",
        json=pilot_payload,
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert pilot_res.status_code == 201
    pilot_data = pilot_res.json()
    pilot_id = pilot_data["id"]
    assert len(pilot_data["milestones"]) == 2
    assert len(pilot_data["kpis"]) == 1
    m1_id = pilot_data["milestones"][0]["id"]
    kpi_id = pilot_data["kpis"][0]["id"]

    # 6. Startup submits Milestone 1 deliverable
    sub_m1_res = client.post(
        f"/api/v1/pilots/{pilot_id}/milestones/{m1_id}/submit",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert sub_m1_res.status_code == 200
    assert sub_m1_res.json()["status"] == "DELIVERABLE_SUBMITTED"

    # 7. Government approves Milestone 1 and disburses tranche
    appr_m1_res = client.post(
        f"/api/v1/pilots/{pilot_id}/milestones/{m1_id}/approve",
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert appr_m1_res.status_code == 200
    assert appr_m1_res.json()["status"] == "TRANCHE_DISBURSED"

    # 8. Update KPI telemetry measurement
    kpi_update_res = client.post(
        f"/api/v1/pilots/{pilot_id}/kpis/{kpi_id}/update",
        json={"achieved_value": 14.2, "verification_source": "PHC Alwar Field Log Batch #4"},
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert kpi_update_res.status_code == 200
    assert kpi_update_res.json()["achieved_value"] == 14.2
