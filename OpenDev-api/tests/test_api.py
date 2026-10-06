import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.core.config import Settings, get_settings
from app.main import app


@pytest.fixture(autouse=True)
def isolated_settings():
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None, supabase_url=None, supabase_publishable_key=None
    )
    try:
        yield
    finally:
        app.dependency_overrides.clear()


def test_health_and_openapi_are_available_without_supabase():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "service": "opendev-api"}
        schema = client.get("/openapi.json").json()
        assert "/api/v1/posts" in schema["paths"]
        assert "/api/v1/discover/communities" in schema["paths"]


def test_protected_endpoint_rejects_missing_access_token():
    with TestClient(app) as client:
        response = client.get("/api/v1/me")
    assert response.status_code == 401


def test_invalid_post_is_rejected_before_database_write():
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="test-user")
    app.dependency_overrides[get_supabase_client] = lambda: None
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/posts", json={"title": "", "body": ""})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
