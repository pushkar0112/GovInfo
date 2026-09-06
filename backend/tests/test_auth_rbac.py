import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.security import UserRole, hash_password

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure clean tables before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_startup_registration_and_login_flow():
    email = "innovator@agritech.dev"
    password = "SecurePassword123!"

    # 1. Register STARTUP
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Pooja Hegde",
            "role": "STARTUP",
            "company_name": "AgriSensor Labs",
            "dpiit_number": "DPIIT-77665",
            "sector": "AgriTech",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "STARTUP"
    assert data["user"]["company_name"] == "AgriSensor Labs"

    # 2. Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # 3. GET /me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email
    assert me_res.json()["full_name"] == "Pooja Hegde"

    # 4. Refresh token
    ref_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert ref_res.status_code == 200
    new_tokens = ref_res.json()
    assert "access_token" in new_tokens
    assert new_tokens["access_token"] != ""

    # 5. Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout_res.status_code == 200


def test_reject_duplicate_email():
    payload = {
        "email": "duplicate@test.gov.in",
        "password": "Password123!",
        "full_name": "Official One",
        "role": "GOVERNMENT",
        "department_name": "Dept of Water",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()


def test_reject_admin_direct_registration():
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "hacker@evil.com",
            "password": "AdminPassword123!",
            "full_name": "Malicious User",
            "role": "ADMIN",
        },
    )
    # Pydantic validation rejects ADMIN role at schema level with 422/400
    assert res.status_code in (400, 422)


def test_invalid_login_credentials():
    # Nonexistent user
    res1 = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nowhere.com", "password": "Password123!"},
    )
    assert res1.status_code == 401

    # Wrong password
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@domain.com",
            "password": "CorrectPassword123!",
            "full_name": "Real User",
            "role": "STARTUP",
            "company_name": "Real Tech",
        },
    )
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": "user@domain.com", "password": "WrongPassword123!"},
    )
    assert res2.status_code == 401


def test_unauthenticated_me_access():
    res1 = client.get("/api/v1/auth/me")
    assert res1.status_code == 401

    res2 = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.payload"},
    )
    assert res2.status_code == 401


def test_role_based_access_control():
    # Register Government user
    gov_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "officer@railways.gov.in",
            "password": "GovPassword123!",
            "full_name": "Shri Verma",
            "role": "GOVERNMENT",
            "department_name": "Ministry of Railways",
        },
    )
    assert gov_res.status_code == 201
    gov_token = gov_res.json()["access_token"]

    # Register Startup user
    startup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "founder@railtech.io",
            "password": "StartupPassword123!",
            "full_name": "Kavita Rao",
            "role": "STARTUP",
            "company_name": "RailTech Analytics",
        },
    )
    assert startup_res.status_code == 201
    startup_token = startup_res.json()["access_token"]

    # 1. Government user can access government overview
    res_gov = client.get(
        "/api/v1/portal/government-overview",
        headers={"Authorization": f"Bearer {gov_token}"},
    )
    assert res_gov.status_code == 200

    # 2. Startup user CANNOT access government overview (403 Forbidden)
    res_forbidden = client.get(
        "/api/v1/portal/government-overview",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert res_forbidden.status_code == 403
    assert "Access denied" in res_forbidden.json()["detail"]

    # 3. Startup user can access startup overview
    res_startup = client.get(
        "/api/v1/portal/startup-overview",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert res_startup.status_code == 200

    # 4. Startup user CANNOT access admin users list
    res_admin = client.get(
        "/api/v1/auth/admin/users",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert res_admin.status_code == 403


def test_profile_update():
    # Register user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "expert@university.edu",
            "password": "ExpertPassword123!",
            "full_name": "Dr. Initial Name",
            "role": "EXPERT",
            "organization_name": "National Research Lab",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]

    # Update profile
    patch_res = client.patch(
        "/api/v1/auth/profile",
        json={
            "full_name": "Dr. Updated Name",
            "designation": "Chief Research Scientist",
            "phone_number": "+91-9988776655",
            "domain_expertise": "Quantum Computing & Telemetry",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["full_name"] == "Dr. Updated Name"
    assert updated["designation"] == "Chief Research Scientist"
    assert updated["phone_number"] == "+91-9988776655"
    assert updated["role"] == "EXPERT"
