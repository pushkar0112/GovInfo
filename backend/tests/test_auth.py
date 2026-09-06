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


def test_register_and_login_government_user():
    email = "nodal.officer@meity.gov.in"
    password = "GovPassword123!"

    # 1. Register government user
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Dr. Rajesh Kumar",
            "role": "GOVERNMENT",
            "department_name": "Ministry of Electronics and IT",
            "department_code": "MEITY-01",
            "ministry": "Ministry of Electronics and IT",
        },
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["role"] == "GOVERNMENT"
    assert reg_data["user"]["department_name"] == "Ministry of Electronics and IT"

    # 2. Login with credentials
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # 3. Access /auth/me with Bearer token
    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email


def test_register_startup_and_verify_rbac():
    email = "founder@innovatetech.io"
    password = "StartupPassword123!"

    # 1. Register startup user
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Ananya Sharma",
            "role": "STARTUP",
            "company_name": "InnovateTech AI Solutions",
            "dpiit_number": "DPIIT-89210",
            "sector": "CivicTech",
        },
    )
    assert reg_response.status_code == 201
    startup_token = reg_response.json()["access_token"]

    # 2. Startup can access startup-overview
    so_response = client.get(
        "/api/v1/portal/startup-overview",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert so_response.status_code == 200
    assert so_response.json()["portal"] == "Startup Portal"
    assert so_response.json()["dpiit_status"] == "RECOGNIZED"

    # 3. Startup CANNOT access government-overview (RBAC 403 Forbidden)
    gov_response = client.get(
        "/api/v1/portal/government-overview",
        headers={"Authorization": f"Bearer {startup_token}"},
    )
    assert gov_response.status_code == 403
    assert "Access denied" in gov_response.json()["detail"]


def test_invalid_login():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@gov.in", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401
