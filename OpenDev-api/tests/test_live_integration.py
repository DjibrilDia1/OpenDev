from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.main import app

USER_ID = "b043cb90-9652-455d-ad64-30a8435a757c"
COMMUNITY_ID = "397c6719-2b6c-44cb-a698-f98aec9d60d7"


class ScopedClient:
    def __init__(self):
        self.calls = []

    async def select(self, resource, filters):
        self.calls.append((resource, filters))
        if resource == "profiles":
            return [{"id": USER_ID, "username": "real-member"}]
        return []

    async def update(self, resource, filters, body):
        self.calls.append((resource, filters, body))
        return []

    async def upsert(self, resource, body, *, on_conflict):
        self.calls.append((resource, {"on_conflict": on_conflict}, body))
        return body

    async def insert(self, resource, body):
        self.calls.append((resource, body))
        return body

    async def delete(self, resource, filters):
        self.calls.append((resource, filters))
        return []

    async def request(self, method, resource, *, body):
        self.calls.append((resource, {"method": method}, body))
        return {"id": USER_ID, **body["payload"]}


@pytest.fixture
def scoped():
    client = ScopedClient()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER_ID)
    app.dependency_overrides[get_supabase_client] = lambda: client
    try:
        with TestClient(app) as browser:
            yield browser, client
    finally:
        app.dependency_overrides.clear()


def test_my_state_only_queries_authenticated_user(scoped):
    browser, client = scoped
    result = browser.get("/api/v1/me/state")
    assert result.status_code == 200
    assert result.json()["profile"]["id"] == USER_ID
    assert len(client.calls) == 6
    for resource, filters in client.calls:
        key = (
            "id"
            if resource == "profiles"
            else "follower_id"
            if resource == "follows"
            else "user_id"
        )
        assert filters[key] == f"eq.{USER_ID}"


def test_state_requires_authentication():
    with TestClient(app) as client:
        assert client.get("/api/v1/me/state").status_code == 401


def test_update_community_preserves_owner_scope(scoped):
    browser, client = scoped
    response = browser.patch(
        f"/api/v1/communities/{UUID(COMMUNITY_ID)}",
        json={"name": "Public community", "description": "A real description"},
    )
    assert response.status_code == 404
    assert client.calls[0][1]["created_by"] == f"eq.{USER_ID}"


def test_update_cannot_change_community_owner(scoped):
    browser, client = scoped
    response = browser.patch(
        f"/api/v1/communities/{COMMUNITY_ID}",
        json={"name": "Community", "description": "Description", "created_by": COMMUNITY_ID},
    )
    assert response.status_code == 422
    assert client.calls == []


def test_existing_profile_is_not_overwritten(scoped):
    browser, client = scoped
    response = browser.put("/api/v1/profiles/me")
    assert response.status_code == 200
    assert response.json()["username"] == "real-member"
    assert len(client.calls) == 1


def test_ensure_my_profile_creates_profile_with_registration_metadata():
    client = ScopedClient()

    async def fake_select(resource, filters):
        client.calls.append((resource, filters))
        return []

    async def fake_insert(resource, body):
        client.calls.append((resource, body))
        return body

    client.select = fake_select
    client.insert = fake_insert
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=USER_ID,
        metadata={
            "username": "ada.lovelace",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "full_name": "Ada Lovelace",
        },
    )
    app.dependency_overrides[get_supabase_client] = lambda: client
    try:
        with TestClient(app) as browser:
            response = browser.put("/api/v1/profiles/me")
            assert response.status_code == 200
            assert response.json()["username"] == "ada.lovelace"
            assert response.json()["first_name"] == "Ada"
            assert response.json()["last_name"] == "Lovelace"
    finally:
        app.dependency_overrides.clear()


def test_onboarding_persists_fields_for_current_user(scoped):
    browser, client = scoped

    async def save(resource, filters, body):
        client.calls.append((resource, filters, body))
        return [{"id": USER_ID, **body}]

    client.update = save
    response = browser.put(
        "/api/v1/profiles/me/onboarding",
        json={
            "username": "ada.lovelace",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "tags": ["Python"],
            "interests": ["Frontend"],
            "full_name": "  Ada Lovelace  ",
            "headline": "  Développeuse  ",
            "bio": "Une bio",
            "location": "Londres",
        },
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Ada Lovelace"
    assert len(client.calls) == 1
    assert client.calls[0][0] == "rpc/complete_onboarding"
    assert client.calls[0][2]["payload"]["headline"] == "Développeuse"


@pytest.mark.parametrize(
    "body",
    [
        {"full_name": " ", "headline": "Développeuse"},
        {"full_name": "Ada", "headline": " "},
        {"full_name": "Ada", "headline": "Développeuse", "role": "admin"},
        {"full_name": "Ada", "headline": "Développeuse", "id": COMMUNITY_ID},
    ],
)
def test_onboarding_rejects_invalid_or_privileged_fields(scoped, body):
    browser, client = scoped
    assert (
        browser.put(
            "/api/v1/profiles/me/onboarding",
            json={
                "username": "ada.lovelace",
                "first_name": "Ada",
                "last_name": "Lovelace",
                "tags": ["Python"],
                "interests": ["Frontend"],
                **body,
            },
        ).status_code
        == 422
    )
    assert client.calls == []


def test_onboarding_requires_authentication():
    with TestClient(app) as client:
        response = client.put(
            "/api/v1/profiles/me/onboarding",
            json={
                "username": "ada.lovelace",
                "interests": ["Frontend"],
                "full_name": "Ada",
                "headline": "Développeuse",
            },
        )
        assert response.status_code == 401
