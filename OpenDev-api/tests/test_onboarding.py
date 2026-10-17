from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.main import app
from app.repositories.supabase_rest import SupabaseRestError

USER = str(uuid4())
OTHER = str(uuid4())


class Client:
    def __init__(self):
        self.calls = []
        self.fail_insert = False
        self.exists = True

    async def select(self, resource, filters):
        self.calls.append((resource, filters))
        if resource == "technology_catalog":
            return [{"name": "Python", "category": "Langages"}]
        if resource == "interest_catalog":
            return [{"name": "Web"}]
        if resource == "profiles":
            return [{"id": OTHER}] if self.exists else []
        if resource == "follows":
            return [{"followed_id": OTHER}]
        return []

    async def upsert(self, resource, body, *, on_conflict):
        self.calls.append((resource, body, on_conflict))
        return body

    async def insert(self, resource, body):
        self.calls.append((resource, body))
        if self.fail_insert:
            raise SupabaseRestError(409, "upstream detail must not leak")
        return body

    async def delete(self, resource, filters):
        self.calls.append((resource, filters))
        return []

    async def request(self, method, resource, *, body):
        raise SupabaseRestError(409, "upstream detail must not leak")


@pytest.fixture
def api():
    db = Client()
    app.dependency_overrides[get_supabase_client] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER)
    try:
        with TestClient(app) as client:
            yield client, db
    finally:
        app.dependency_overrides.clear()


def test_catalog_and_missing_draft(api):
    client, _ = api
    assert client.get("/api/v1/me/onboarding").json() is None
    assert client.get("/api/v1/onboarding/catalog").json() == {
        "technologies": [{"name": "Python", "category": "Langages"}],
        "interests": ["Web"],
    }


def test_draft_saves_partial_fields_with_own_identity(api):
    client, db = api
    body = {"step": 2, "data": {"username": "a", "website_url": "https:", "first_name": ""}}
    response = client.put("/api/v1/me/onboarding", json=body)
    assert response.status_code == 200
    assert response.json()["data"]["website_url"] == "https:"
    assert db.calls[0][1]["user_id"] == USER


@pytest.mark.parametrize(
    "body",
    [
        {"step": 6, "data": {}},
        {"step": 0, "data": {"onboarding_completed_at": "now"}},
        {"step": 0, "data": {"user_id": OTHER}},
    ],
)
def test_draft_rejects_invalid_or_privileged_data(api, body):
    client, db = api
    assert client.put("/api/v1/me/onboarding", json=body).status_code == 422
    assert db.calls == []


def test_username_queries_escape_wildcards_and_exclude_self(api):
    client, db = api
    assert client.get("/api/v1/me/username-availability?username=ada_dev").status_code == 200
    assert db.calls[-1][1]["username"] == r"ilike.ada\_dev"
    assert db.calls[-1][1]["id"] == f"neq.{USER}"
    assert client.get("/api/v1/auth/username-availability?username=ada_dev").status_code == 200
    assert "id" not in db.calls[-1][1]
    assert client.get("/api/v1/auth/username-availability?username=ad*").status_code == 422


def test_follow_idempotence_self_protection_and_delete_scope(api):
    client, db = api
    path = f"/api/v1/profiles/{OTHER}/follow"
    assert client.put(path).json() == {"following": True}
    db.fail_insert = True
    assert client.put(path).json() == {"following": True}
    assert client.delete(path).json() == {"following": False}
    assert db.calls[-1][1]["follower_id"] == f"eq.{USER}"
    assert client.put(f"/api/v1/profiles/{USER}/follow").status_code == 422
    db.exists = False
    assert client.put(path).status_code == 404


def test_completion_conflict_does_not_leak_database_details(api):
    client, _ = api
    response = client.put(
        "/api/v1/profiles/me/onboarding",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "full_name": "Ada Lovelace",
            "username": "ada",
            "headline": "Developer",
            "tags": ["Custom technology"],
            "interests": ["Web"],
        },
    )
    assert response.status_code == 409
    assert "upstream" not in response.text


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/api/v1/me/onboarding"),
        ("put", "/api/v1/me/onboarding"),
        ("put", f"/api/v1/profiles/{OTHER}/follow"),
        ("delete", f"/api/v1/profiles/{OTHER}/follow"),
    ],
)
def test_private_routes_require_authentication(method, path):
    with TestClient(app) as client:
        assert getattr(client, method)(path).status_code == 401
