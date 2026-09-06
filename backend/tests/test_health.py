from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health_endpoint():
    """Verify GET /api/health returns 200 OK with expected contract."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "govinnovate-api",
    }


def test_api_v1_health_endpoint():
    """Verify GET /api/v1/health returns 200 OK with expected contract."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "govinnovate-api",
    }


def test_root_endpoint():
    """Verify GET / returns basic service discovery info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "govinnovate-api"
    assert data["status"] == "online"
