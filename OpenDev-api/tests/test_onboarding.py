from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.main import app
from app.repositories.supabase_rest import SupabaseRestError
from app.schemas.platform import ProfileOnboarding, ProfileUpdate

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
        self.calls.append((resource, {"method": method}, body))
        assert method == "POST"
        if resource == "rpc/contribution_scores":
            assert body == {"p_user_ids": [OTHER]}
            return [{"user_id": OTHER, "score": 11}]
        assert resource == "rpc/complete_onboarding"
        assert set(body) == {"payload"}
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


def test_draft_rejects_invalid_stage(api):
    client, db = api
    assert client.put("/api/v1/me/onboarding", json={"step": 6, "data": {}}).status_code == 422
    assert db.calls == []


@pytest.mark.parametrize("extra", [{"onboarding_completed_at": "now"}, {"user_id": OTHER}])
def test_draft_ignores_stale_privileged_fields_without_persisting_them(api, extra):
    client, db = api
    response = client.put("/api/v1/me/onboarding", json={"step": 0, "data": extra})
    assert response.status_code == 200
    assert not extra.keys() & response.json()["data"].keys()
    assert db.calls[0][1]["user_id"] == USER
    assert not extra.keys() & db.calls[0][1]["data"].keys()


def test_username_queries_match_exact_literals_and_exclude_self(api):
    client, db = api
    assert client.get("/api/v1/me/username-availability?username=ada_dev").status_code == 200
    assert db.calls[-1][1]["username"] == "eq.ada_dev"
    assert db.calls[-1][1]["id"] == f"neq.{USER}"
    assert client.get("/api/v1/auth/username-availability?username=ada_dev").status_code == 200
    assert "id" not in db.calls[-1][1]
    assert client.get("/api/v1/auth/username-availability?username=ad*").status_code == 200
    assert db.calls[-1][1]["username"] == "eq.ad*"


@pytest.mark.parametrize(
    "username", ["a", "é", "développeur sénégal", "*_%", "名字", "🐍", 'a,"b\\c']
)
def test_username_accepts_short_unicode_and_literal_punctuation(api, username):
    client, db = api
    for path in ("/api/v1/auth/username-availability", "/api/v1/me/username-availability"):
        response = client.get(path, params={"username": username})
        assert response.status_code == 200
        assert db.calls[-1][1]["username"] == f"eq.{username}"
    assert ProfileUpdate(username=username).username == username
    payload = ProfileOnboarding(
        username=username,
        first_name="Ada",
        last_name="Lovelace",
        full_name="Ada Lovelace",
        headline="Developer",
        interests=["Web"],
        tags=["Python"],
    )
    assert payload.username == username


@pytest.mark.parametrize("username", ["", "   ", "A", "Éric", "a" * 31, "🐍" * 31])
def test_username_rejects_empty_uppercase_or_overlong_values(api, username):
    client, db = api
    for path in ("/api/v1/auth/username-availability", "/api/v1/me/username-availability"):
        assert client.get(path, params={"username": username}).status_code == 422
    with pytest.raises(ValidationError):
        ProfileUpdate(username=username)
    assert db.calls == []


def test_username_trims_and_counts_unicode_characters(api):
    client, db = api
    username = "🐍" * 30
    assert (
        client.get(
            "/api/v1/auth/username-availability", params={"username": "  " + username + "  "}
        ).status_code
        == 200
    )
    assert db.calls[-1][1]["username"] == f"eq.{username}"
    assert ProfileUpdate(username="  é  ").username == "é"


def test_profile_lookup_supports_unicode_and_slashes(api):
    client, db = api
    response = client.get("/api/v1/profiles/équipe%2Fdev")
    assert response.status_code == 200
    assert response.json() == {"id": OTHER, "contribution_score": 11}
    assert db.calls == [
        ("profiles", {"select": "*", "username": "eq.équipe/dev", "limit": "1"}),
        ("rpc/contribution_scores", {"method": "POST"}, {"p_user_ids": [OTHER]}),
    ]


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
