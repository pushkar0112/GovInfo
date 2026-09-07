import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.models.application import Application
from app.models.challenge import Challenge
from app.models.ai_assessment import AIAssessment, AIAssessmentStatus, AIRecommendation
from app.services.ai_shortlisting_service import AIShortlistingService

client = TestClient(app)


def test_ai_shortlisting_calculation_and_weights():
    """Verify the 6 weighted factor calculations and explainability outputs."""
    # 1. Register Gov official
    gov_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "ai.nodal.officer@morth.gov.in",
            "password": "SecurePassword123!",
            "full_name": "Dr. Vikas Verma",
            "role": "GOVERNMENT",
            "department_name": "Ministry of Road Transport",
            "department_code": "MORTH-01",
            "ministry": "MoRTH",
        },
    )
    assert gov_resp.status_code == 201
    gov_token = gov_resp.json()["access_token"]
    gov_headers = {"Authorization": f"Bearer {gov_token}"}

    # 2. Register Startup
    startup_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "traffic.lead@traffixai.io",
            "password": "SecureStartup123!",
            "full_name": "Rahul Raman",
            "role": "STARTUP",
            "company_name": "Traffix AI Technologies",
            "dpiit_number": "DPIIT-78192",
        },
    )
    assert startup_resp.status_code == 201
    startup_token = startup_resp.json()["access_token"]
    startup_headers = {"Authorization": f"Bearer {startup_token}"}

    # 3. Create Challenge: Traffic & Emergency Route Optimization
    chal_resp = client.post(
        "/api/v1/challenges",
        headers=gov_headers,
        json={
            "title": "Autonomous Congestion Prediction & Dynamic Emergency Corridor Routing",
            "domain": "CivicTech",
            "problem_statement": "Urban junction transit delays impede emergency ambulances and civil fire tenders. Legacy manual traffic signals lack real-time congestion prediction.",
            "desired_outcome": "Reduce emergency corridor transit latency by 35% with dynamic real-time traffic signal preemption telemetry.",
            "pilot_duration_days": 90,
            "status": "PUBLISHED",
            "kpis": [
                {
                    "name": "Emergency Transit Delay Reduction",
                    "target_value": 35.0,
                    "measurement_unit": "%",
                    "weight": 50.0,
                },
                {
                    "name": "Concordance with Ambulance GPS Telemetry",
                    "target_value": 95.0,
                    "measurement_unit": "%",
                    "weight": 50.0,
                },
            ],
        },
    )
    assert chal_resp.status_code in [200, 201]
    challenge_id = chal_resp.json()["id"]

    # 4. Submit Startup Application
    app_resp = client.post(
        "/api/v1/applications",
        headers=startup_headers,
        json={
            "challenge_id": challenge_id,
            "proposal_title": "AI-Powered Smart Traffic & Emergency Route Optimization System",
            "executive_summary": "Our solution deploys edge-AI vision telemetry and Dijkstra/A* routing algorithms to dynamically prioritize ambulances across signal corridors.",
            "problem_understanding": "Municipal junctions lack predictive congestion telemetry; static timer signals cause fatal transit delays for emergency responders.",
            "proposed_solution": "Edge IoT cameras run neural inference locally and communicate with municipal traffic controllers over low-latency MQTT message queues.",
            "technical_approach": "Architecture consists of edge neural vision processing, real-time telemetry pipelines, offline fallback, and dynamic green-wave corridor clearance (TRL 8).",
            "expected_outcomes": "Guarantees 38% reduction in emergency corridor transit delays and 96% concordance with ambulance GPS telemetry.",
            "implementation_plan": "Phase 1 (Days 1-30): Sensor mounting. Phase 2 (Days 31-60): Corridor calibration. Phase 3 (Days 61-90): Empirical sandbox validation.",
            "pilot_plan": "Controlled sandbox deployment across 12 high-traffic urban junctions in Sector 4 municipal jurisdiction.",
            "timeline_days": 90,
            "requested_budget": 1200000.0,
            "risks": "Inclement monsoon weather may reduce optical camera range; mitigated via radar-infrared sensor fusion.",
            "team_capabilities": "Core engineering team includes 4 PhDs from IIT Madras in Distributed Systems and Computer Vision.",
            "previous_deployments": "Successfully deployed municipal smart corridor trials with Bengaluru Smart City across 8 intersections.",
        },
    )
    assert app_resp.status_code in [200, 201]
    app_id = app_resp.json()["id"]

    # Transition to SUBMITTED
    submit_resp = client.post(
        f"/api/v1/applications/{app_id}/submit",
        headers=startup_headers,
        json={
            "challenge_id": challenge_id,
            "proposal_title": "AI-Powered Smart Traffic & Emergency Route Optimization System",
            "executive_summary": "Our solution deploys edge-AI vision telemetry and Dijkstra/A* routing algorithms to dynamically prioritize ambulances across signal corridors.",
            "problem_understanding": "Municipal junctions lack predictive congestion telemetry; static timer signals cause fatal transit delays for emergency responders.",
            "proposed_solution": "Edge IoT cameras run neural inference locally and communicate with municipal traffic controllers over low-latency MQTT message queues.",
            "technical_approach": "Architecture consists of edge neural vision processing, real-time telemetry pipelines, offline fallback, and dynamic green-wave corridor clearance (TRL 8).",
            "expected_outcomes": "Guarantees 38% reduction in emergency corridor transit delays and 96% concordance with ambulance GPS telemetry.",
            "implementation_plan": "Phase 1 (Days 1-30): Sensor mounting. Phase 2 (Days 31-60): Corridor calibration. Phase 3 (Days 61-90): Empirical sandbox validation.",
            "pilot_plan": "Controlled sandbox deployment across 12 high-traffic urban junctions in Sector 4 municipal jurisdiction.",
            "timeline_days": 90,
            "requested_budget": 1200000.0,
        },
    )
    assert submit_resp.status_code == 200

    # 5. Fetch AI Assessment via Government endpoint
    ai_resp = client.get(f"/api/v1/government/applications/{app_id}/ai-assessment", headers=gov_headers)
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()

    assert ai_data["status"] == "COMPLETED"
    assert ai_data["score_label"] == "AI-Assisted Match Score"
    assert ai_data["overall_score"] is not None
    assert 0.0 <= ai_data["overall_score"] <= 100.0
    assert ai_data["overall_score"] >= 75.0  # Strong match given detailed alignment
    assert ai_data["recommendation"] in ["STRONG_MATCH", "MODERATE_MATCH"]
    assert "Demo/Rule-Based Mode" in ai_data["mode_label"]

    # Verify all 6 factors are present with correct weights
    factors_by_key = {f["factor_key"]: f for f in ai_data["factors"]}
    assert len(factors_by_key) == 6

    # 1. Problem–Solution Fit (30%)
    assert factors_by_key["problem_solution_fit"]["weight_percentage"] == 30.0
    assert factors_by_key["problem_solution_fit"]["max_score"] == 30.0
    assert factors_by_key["problem_solution_fit"]["score"] > 20.0

    # 2. Technical Readiness (20%)
    assert factors_by_key["technical_readiness"]["weight_percentage"] == 20.0
    assert factors_by_key["technical_readiness"]["max_score"] == 20.0
    assert factors_by_key["technical_readiness"]["score"] >= 16.0

    # 3. KPI Alignment (20%)
    assert factors_by_key["kpi_alignment"]["weight_percentage"] == 20.0
    assert factors_by_key["kpi_alignment"]["max_score"] == 20.0
    assert factors_by_key["kpi_alignment"]["score"] >= 15.0

    # 4. Pilot Feasibility (15%)
    assert factors_by_key["pilot_feasibility"]["weight_percentage"] == 15.0
    assert factors_by_key["pilot_feasibility"]["max_score"] == 15.0
    assert factors_by_key["pilot_feasibility"]["score"] >= 11.0

    # 5. Relevant Experience (10%)
    assert factors_by_key["relevant_experience"]["weight_percentage"] == 10.0
    assert factors_by_key["relevant_experience"]["max_score"] == 10.0
    assert factors_by_key["relevant_experience"]["score"] >= 7.0

    # 6. Risk & Completeness (5%)
    assert factors_by_key["risk_completeness"]["weight_percentage"] == 5.0
    assert factors_by_key["risk_completeness"]["max_score"] == 5.0
    assert factors_by_key["risk_completeness"]["score"] >= 3.0

    # Verify explainability
    assert len(ai_data["positive_reasons"]) >= 3
    assert len(ai_data["risk_flags"]) >= 1

    # Verify reproducibility: re-fetching returns the exact same score
    ai_resp_2 = client.get(f"/api/v1/government/applications/{app_id}/ai-assessment", headers=gov_headers)
    assert ai_resp_2.json()["overall_score"] == ai_data["overall_score"]


def test_ai_shortlisting_insufficient_data():
    """Verify that empty/incomplete applications do not fabricate scores and return INSUFFICIENT_DATA."""
    # Register Gov officer
    gov_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "empty.officer@mohua.gov.in",
            "password": "SecurePassword123!",
            "full_name": "Suresh Gupta",
            "role": "GOVERNMENT",
            "department_name": "Urban Development",
            "department_code": "MOHUA-01",
            "ministry": "MoHUA",
        },
    )
    gov_token = gov_resp.json()["access_token"]
    gov_headers = {"Authorization": f"Bearer {gov_token}"}

    # Register Startup
    startup_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "empty.founder@sparse.io",
            "password": "SecureStartup123!",
            "full_name": "Aman Verma",
            "role": "STARTUP",
            "company_name": "Sparse Data Tech",
            "dpiit_number": "DPIIT-99231",
        },
    )
    startup_token = startup_resp.json()["access_token"]
    startup_headers = {"Authorization": f"Bearer {startup_token}"}

    # Create challenge
    chal_resp = client.post(
        "/api/v1/challenges",
        headers=gov_headers,
        json={
            "title": "Subsurface Pipeline Leak Telemetry",
            "domain": "CleanTech",
            "problem_statement": "Urban pipeline water leaks go undetected for days.",
            "desired_outcome": "Detect underground pipe leakage under 4 hours.",
            "pilot_duration_days": 60,
            "status": "PUBLISHED",
        },
    )
    challenge_id = chal_resp.json()["id"]

    # Create sparse draft application
    draft_resp = client.post(
        "/api/v1/applications",
        headers=startup_headers,
        json={
            "challenge_id": challenge_id,
            "proposal_title": "Draft Idea",
            "executive_summary": "Short",  # < 20 chars
            "proposed_solution": "",
            "technical_approach": "",
        },
    )
    app_id = draft_resp.json()["id"]

    # Directly evaluate via service on sparse app
    db = next(get_db())
    try:
        app_record = db.query(Application).filter(Application.id == app_id).first()
        challenge_record = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        assessment = AIShortlistingService.analyze_application(db, app_record, challenge_record)

        assert assessment.status == AIAssessmentStatus.INSUFFICIENT_DATA.value
        assert assessment.overall_score is None
        assert "additional application information is required" in assessment.summary
    finally:
        db.close()
