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
        "full_name": f"Test {role} Persona",
        "role": role,
        **kwargs,
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    return res.json()["access_token"]


def test_complete_seven_stage_lifecycle():
    """
    End-to-End Verification of the Complete Innovation Lifecycle:
    Problem -> Challenge -> Startup -> Evaluation -> Pilot -> Evidence -> Scale
    """
    # 1. Register all stakeholder personas
    gov_token = register_user("GOVERNMENT", "officer@jal.gov.in", department_name="Department of Drinking Water & Sanitation")
    startup_token = register_user("STARTUP", "founder@aquasense.io", company_name="AquaSense Telemetry", dpiit_number="DPIIT-66120")
    evaluator_token = register_user("EXPERT_EVALUATOR", "chair@iitd.ac.in")
    validator_token = register_user("INDEPENDENT_VALIDATOR", "auditor@stqc.gov.in")
    procurement_token = register_user("PROCUREMENT_OFFICER", "sanction@gem.gov.in")

    # 2. Stage 1 & 2: Government posts Challenge
    ch_res = client.post(
        "/api/v1/challenges",
        json={
            "title": "Subsurface Potable Water Pipeline Acoustic Leak Detection",
            "problem_statement": "Municipal pipelines lose 40% of treated drinking water via unmapped ground leakages.",
            "outcome_definition": "Pinpoint subsurface acoustic leak locations within 3-meter spatial accuracy without road trenching.",
            "target_sector": "CivicTech",
            "budget_estimate": 2500000.0,
            "pilot_duration_months": 3.0,
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert ch_res.status_code == 201
    challenge_id = ch_res.json()["id"]

    # 3. Stage 3: Startup Discovers & Applies
    app_res = client.post(
        f"/api/v1/challenges/{challenge_id}/apply",
        json={
            "proposal_summary": "Autonomous acoustic vibrometer sensor arrays deployed at hydrant valves with spectral ML.",
            "technical_approach": "Wavelet cross-correlation localization running on solar-powered mesh nodes.",
            "proposed_solution_trl": "TRL 8",
        },
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert app_res.status_code == 201
    application_id = app_res.json()["id"]

    # 4. Stage 4: Expert Evaluation
    eval_res = client.post(
        f"/api/v1/pilots/applications/{application_id}/evaluate",
        json={
            "technical_score": 92.0,
            "operational_score": 88.0,
            "commercial_score": 85.0,
            "evaluator_feedback": "Exemplary solution with robust localization accuracy and zero civil disruption.",
            "recommendation": "STRONGLY_RECOMMEND",
        },
        headers={"Authorization": f"Bearer {evaluator_token}"},
    )
    assert eval_res.status_code == 201

    # 5. Stage 5: Controlled Pilot Sandbox
    pilot_res = client.post(
        "/api/v1/pilots",
        json={
            "application_id": application_id,
            "title": "Municipal Water Acoustic Leakage Sandbox Trial",
            "scope_of_work": "Deploy 50 vibrometer units across Zone 4 Jaipur Feeder Network.",
            "duration_weeks": 12,
            "sandbox_location": "Jaipur Municipal Corporation Water Grid",
            "approved_budget": 2500000.0,
            "milestones": [
                {
                    "sequence_number": 1,
                    "title": "Grid Calibration & Pilot Hydrant Mounts",
                    "deliverable_description": "Deploy 50 units and establish mesh gateway connectivity.",
                    "tranche_amount": 1000000.0,
                    "due_date": (date.today() + timedelta(days=30)).isoformat(),
                }
            ],
            "kpis": [
                {
                    "metric_name": "Acoustic Localization Error",
                    "baseline_value": 25.0,
                    "target_value": 3.0,
                    "unit": "meters",
                }
            ],
        },
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert pilot_res.status_code == 201
    pilot_id = pilot_res.json()["id"]

    # 6. Stage 6: Independent 3rd-Party Validation (Evidence)
    val_res = client.post(
        "/api/v1/validations",
        json={
            "pilot_id": pilot_id,
            "independent_agency_name": "STQC / IIT Delhi Civil Engineering Lab",
            "validation_report_summary": "Empirically audited 14 deliberate and natural leak points. Mean spatial localization error measured at 2.1 meters, comfortably exceeding the 3-meter outcome requirement.",
            "outcomes_satisfied": True,
            "recommended_for_procurement": True,
        },
        headers={"Authorization": f"Bearer {validator_token}"},
    )
    assert val_res.status_code == 201
    val_data = val_res.json()
    validation_id = val_data["id"]
    assert len(val_data["certificate_hash"]) == 64  # SHA-256 length

    # Verify pilot status transitioned to SUCCESSFULLY_VALIDATED
    pilot_check = client.get(f"/api/v1/pilots/{pilot_id}")
    assert pilot_check.json()["status"] == "SUCCESSFULLY_VALIDATED"

    # 7. Stage 7: Procurement Scale-Up (Scale)
    proc_res = client.post(
        "/api/v1/procurements",
        json={
            "validation_id": validation_id,
            "sanction_order_number": "SANCTION-2024-JAL-0044",
            "gem_contract_number": "GEMC-5116877-902",
            "procurement_pathway": "GEM_STARTUP_RUNWAY",
            "total_order_value": 18500000.0,
            "notes": "Direct scale-up procurement across Jaipur City North Division executed under GFR 2017 Rule 149.",
        },
        headers={"Authorization": f"Bearer {procurement_token}"},
    )
    assert proc_res.status_code == 201
    proc_data = proc_res.json()
    assert proc_data["status"] == "CONTRACT_EXECUTED"
    assert proc_data["sanction_order_number"] == "SANCTION-2024-JAL-0044"

    # Verify challenge status is now PROCURED
    ch_check = client.get(f"/api/v1/challenges/{challenge_id}")
    assert ch_check.json()["status"] == "PROCURED"

    # 8. Verify public registries
    assert len(client.get("/api/v1/validations").json()) == 1
    assert len(client.get("/api/v1/procurements").json()) == 1
