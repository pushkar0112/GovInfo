import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine
from app.services.scoring_service import ScoringService

client = TestClient(app)


def test_scoring_service_deterministic_calculations():
    """Verify mathematical transparent scoring engine precision."""
    # Test criteria weights: 30%, 25%, 25%, 20% = 100%
    scores = [
        {"criterion_id": "c1", "score": 8.0, "max_score": 10.0, "weight": 30.0},  # (8/10)*30 = 24.0
        {"criterion_id": "c2", "score": 4.0, "max_score": 5.0, "weight": 25.0},   # (4/5)*25  = 20.0
        {"criterion_id": "c3", "score": 10.0, "max_score": 10.0, "weight": 25.0}, # (10/10)*25 = 25.0
        {"criterion_id": "c4", "score": 15.0, "max_score": 20.0, "weight": 20.0}, # (15/20)*20 = 15.0
    ]
    # Expected overall: 24.0 + 20.0 + 25.0 + 15.0 = 84.00
    overall = ScoringService.calculate_evaluation_overall_score(scores)
    assert overall == 84.0

    # Multi-expert aggregation: scores 84.0 and 76.0 -> avg 80.0, min 76.0, max 84.0
    agg = ScoringService.aggregate_multi_expert_scores([84.0, 76.0])
    assert agg["evaluations_count"] == 2
    assert agg["average_score"] == 80.0
    assert agg["highest_score"] == 84.0
    assert agg["lowest_score"] == 76.0


def test_criteria_weight_validation_and_crud():
    """Test criteria creation, updating, and weight validation."""
    # 1. Register Gov official
    gov_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "criteria.officer@meity.gov.in",
            "password": "GovPassword123!",
            "full_name": "Official Sharma",
            "role": "GOVERNMENT",
            "department_name": "Digital India",
            "department_code": "DI-01",
            "ministry": "MeitY",
        },
    )
    assert gov_resp.status_code == 201
    gov_token = gov_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {gov_token}"}

    # 2. Create Challenge
    ch_resp = client.post(
        "/api/v1/challenges",
        headers=headers,
        json={
            "title": "AI for Flood Disaster Management",
            "problem_statement": "Real-time flood prediction system using satellite feeds and IoT sensors.",
            "desired_outcome": "Predict flood risk 48 hours in advance with high accuracy.",
            "domain": "DisasterTech",
            "budget_max": 5000000.0,
            "application_deadline": "2026-12-31T23:59:59Z",
        },
    )
    assert ch_resp.status_code == 201
    challenge_id = ch_resp.json()["id"]

    # 3. Add Criteria with weights summing to 100%
    criteria_data = [
        {"title": "Technical Innovation & Feasibility", "weight": 30.0, "max_score": 10.0, "min_score": 0.0, "is_mandatory": True},
        {"title": "Scalability & Deployment Speed", "weight": 25.0, "max_score": 10.0, "min_score": 0.0, "is_mandatory": True},
        {"title": "Cost Efficiency & Budget Realism", "weight": 25.0, "max_score": 10.0, "min_score": 0.0, "is_mandatory": False},
        {"title": "Citizen Impact & Usability", "weight": 20.0, "max_score": 10.0, "min_score": 0.0, "is_mandatory": False},
    ]

    for c in criteria_data:
        res = client.post(f"/api/v1/challenges/{challenge_id}/criteria", headers=headers, json=c)
        assert res.status_code == 201

    # 4. Check weight validation endpoint
    val_resp = client.get(f"/api/v1/challenges/{challenge_id}/criteria/validate-weights", headers=headers)
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["is_valid"] is True
    assert val_data["total_weight"] == 100.0


def test_expert_assignment_coi_and_scoring_lifecycle():
    """Verify expert profile creation, assignment, COI declaration, scoring, and immutable submission."""
    # 1. Register Gov official
    gov_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin.eval@meity.gov.in",
            "password": "GovPassword123!",
            "full_name": "Director Verma",
            "role": "GOVERNMENT",
            "department_name": "Disaster Response Division",
            "department_code": "DRD-01",
            "ministry": "MeitY",
        },
    )
    gov_token = gov_resp.json()["access_token"]
    gov_headers = {"Authorization": f"Bearer {gov_token}"}

    # 2. Register Startup & Profile
    startup_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "ceo@floodai.in",
            "password": "StartupPass123!",
            "full_name": "Aakash Mehta",
            "role": "STARTUP",
            "company_name": "FloodAI Solutions Pvt Ltd",
            "dpiit_number": "DPIIT-88392",
            "sector": "DisasterTech",
            "stage": "MVP",
        },
    )
    startup_token = startup_resp.json()["access_token"]
    startup_headers = {"Authorization": f"Bearer {startup_token}"}

    # Complete startup profile
    client.put(
        "/api/v1/startups/profile",
        json={
            "dpiit_recognition_number": "DPIIT-88392",
            "recognition_status": "VERIFIED",
            "product_stage": "MVP",
            "technology_domains": ["DisasterTech", "AI/ML"],
        },
        headers=startup_headers,
    )

    # 3. Register Expert User
    expert_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "dr.vikram@iitd.ac.in",
            "password": "ExpertPass123!",
            "full_name": "Dr. Vikram Sen",
            "role": "EXPERT",
            "domains": ["AI/ML", "DisasterTech"],
            "designation": "Professor of AI",
            "organization": "IIT Delhi",
        },
    )
    assert expert_resp.status_code == 201
    expert_user_id = expert_resp.json()["user"]["id"]
    expert_token = expert_resp.json()["access_token"]
    expert_headers = {"Authorization": f"Bearer {expert_token}"}

    # Create/update expert profile
    prof_resp = client.post(
        "/api/v1/experts/profile",
        headers=expert_headers,
        json={
            "designation": "Professor of Computer Science & AI",
            "organization": "IIT Delhi",
            "domains": ["AI/ML", "DisasterTech", "Remote Sensing"],
            "years_of_experience": 18,
            "bio": "Expert in sensor fusion, satellite computer vision, and hydrological forecasting.",
            "is_available": True,
        },
    )
    assert prof_resp.status_code in [200, 201]

    # 4. Create Challenge & Criteria
    ch_resp = client.post(
        "/api/v1/challenges",
        headers=gov_headers,
        json={
            "title": "Autonomous Drone Flood Monitoring",
            "problem_statement": "Drones for automated water depth mapping and early alert.",
            "desired_outcome": "Sub-meter water depth accuracy across flood plains.",
            "domain": "DisasterTech",
            "budget_max": 2000000.0,
            "application_deadline": "2026-12-31T23:59:59Z",
            "eligibility_requirements": "DPIIT-recognized startups with demonstrable prototype.",
        },
    )
    assert ch_resp.status_code == 201
    challenge_id = ch_resp.json()["id"]

    crit_resp = client.post(
        f"/api/v1/challenges/{challenge_id}/criteria",
        headers=gov_headers,
        json={
            "title": "Technical Rigor",
            "weight": 100.0,
            "max_score": 10.0,
            "min_score": 0.0,
            "is_mandatory": True,
        },
    )
    assert crit_resp.status_code == 201
    criterion_id = crit_resp.json()["id"]

    # Add required KPI before publishing
    kpi_res = client.post(
        f"/api/v1/challenges/{challenge_id}/kpis",
        headers=gov_headers,
        json={
            "name": "Water Depth Accuracy",
            "target_value": 0.5,
            "measurement_unit": "meters",
            "weight": 100.0,
        },
    )
    assert kpi_res.status_code == 201

    # Publish challenge
    pub_res = client.post(f"/api/v1/challenges/{challenge_id}/publish", headers=gov_headers)
    assert pub_res.status_code == 200

    # 5. Startup Applies and submits application
    app_draft = client.post(
        "/api/v1/applications",
        headers=startup_headers,
        json={
            "challenge_id": challenge_id,
            "proposal_title": "DroneHydro Flood AI",
            "executive_summary": "Deploying 10 edge AI sensor drones for autonomous water mapping in river basins.",
            "problem_understanding": "River basin flooding requires sub-hour real-time hydrological analysis and edge mapping.",
            "proposed_solution": "Deploying autonomous edge-AI drones with sonar, lidar, and acoustic telemetry depth sensors.",
            "technical_approach": "Edge inference models run on drone hardware sending telemetry to municipal command center.",
            "expected_outcomes": "Accurate early flood detection 48 hours in advance minimizing civilian disruption.",
            "implementation_plan": "Phase 1 sensor calibration, Phase 2 flight testing, Phase 3 full municipal deployment.",
            "pilot_plan": "A 12-week controlled pilot across 3 flood plains with ground-truth verification.",
            "requested_budget": 1800000.0,
            "timeline_days": 90,
        },
    )
    assert app_draft.status_code == 201
    application_id = app_draft.json()["id"]

    sub_res = client.post(
        f"/api/v1/applications/{application_id}/submit",
        headers=startup_headers,
    )
    assert sub_res.status_code == 200

    # 6. Gov assigns expert
    assign_resp = client.post(
        f"/api/v1/challenges/{challenge_id}/applications/{application_id}/assign-expert",
        headers=gov_headers,
        json={"expert_id": expert_user_id, "notes": "Please assess technical feasibility"},
    )
    assert assign_resp.status_code == 201
    assignment_id = assign_resp.json()["id"]

    # 7. Expert attempts to score BEFORE declaring COI -> Must fail
    score_attempt = client.post(
        f"/api/v1/expert/assignments/{assignment_id}/draft",
        headers=expert_headers,
        json={
            "recommendation": "RECOMMENDED",
            "feedback": "Preliminary review looks promising.",
            "scores": [{"criterion_id": criterion_id, "score": 9.0, "comment": "Excellent tech"}],
        },
    )
    assert score_attempt.status_code == 400
    assert "conflict of interest" in score_attempt.json()["detail"].lower()

    # 8. Expert declares NO_CONFLICT
    coi_resp = client.post(
        f"/api/v1/expert/assignments/{assignment_id}/coi",
        headers=expert_headers,
        json={"declaration": "NO_CONFLICT", "reason": "No personal or financial ties to applicant."},
    )
    assert coi_resp.status_code in [200, 201]

    # 9. Expert saves draft evaluation
    draft_resp = client.post(
        f"/api/v1/expert/assignments/{assignment_id}/draft",
        headers=expert_headers,
        json={
            "recommendation": "HIGHLY_RECOMMENDED",
            "feedback": "Outstanding technical architecture and proven prototype.",
            "strengths": "Deep drone telemetry integration.",
            "weaknesses": "Battery runtime requires optimization.",
            "scores": [
                {
                    "criterion_id": criterion_id,
                    "score": 9.2,
                    "comment": "Exceptional edge computing models.",
                    "evidence_reference": "Section 3.2 System Architecture diagram",
                }
            ],
        },
    )
    assert draft_resp.status_code == 200
    draft_data = draft_resp.json()
    assert draft_data["is_draft"] is True
    # (9.2 / 10.0) * 100% = 92.0
    assert draft_data["overall_score"] == 92.0

    # 10. Expert submits final evaluation
    submit_resp = client.post(
        f"/api/v1/expert/assignments/{assignment_id}/submit",
        headers=expert_headers,
        json={
            "recommendation": "HIGHLY_RECOMMENDED",
            "feedback": "Final confirmed review: Outstanding.",
            "strengths": "Deep drone telemetry integration.",
            "weaknesses": "Battery runtime requires optimization.",
            "scores": [
                {
                    "criterion_id": criterion_id,
                    "score": 9.5,
                    "comment": "Exceptional edge computing models.",
                    "evidence_reference": "Section 3.2 System Architecture diagram",
                }
            ],
        },
    )
    assert submit_resp.status_code == 200
    submit_data = submit_resp.json()
    assert submit_data["is_submitted"] is True
    assert submit_data["overall_score"] == 95.0

    # 11. Immutability: submitting again or editing draft after submission must fail
    resubmit_resp = client.post(
        f"/api/v1/expert/assignments/{assignment_id}/submit",
        headers=expert_headers,
        json={"recommendation": "RECOMMENDED", "scores": []},
    )
    assert resubmit_resp.status_code == 400

    # 12. Challenge Rankings endpoint for Gov official
    ranking_resp = client.get(
        f"/api/v1/challenges/{challenge_id}/evaluations/rankings",
        headers=gov_headers,
    )
    assert ranking_resp.status_code == 200
    rankings = ranking_resp.json()
    assert len(rankings) == 1
    assert rankings[0]["application_id"] == application_id
    assert rankings[0]["rank"] == 1
    assert rankings[0]["average_score"] == 95.0
    assert rankings[0]["evaluations_count"] == 1

    # 13. Shortlist application
    dec_resp = client.post(
        f"/api/v1/challenges/{challenge_id}/applications/{application_id}/decision",
        headers=gov_headers,
        json={"decision": "SHORTLISTED", "notes": "Approved for pilot phase discussion based on expert review."},
    )
    assert dec_resp.status_code == 200
    assert dec_resp.json()["application_status"] == "SHORTLISTED"
