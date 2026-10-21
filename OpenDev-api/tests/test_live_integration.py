from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.main import app
from app.repositories.supabase_rest import SupabaseRestError

USER_ID = "b043cb90-9652-455d-ad64-30a8435a757c"
COMMUNITY_ID = "397c6719-2b6c-44cb-a698-f98aec9d60d7"


class ScopedClient:
    def __init__(self):
        self.calls = []
        self.community_update_error = None

    async def select(self, resource, filters):
        self.calls.append((resource, filters))
        if resource == "profiles":
            return [{"id": USER_ID, "username": "real-member"}]
        assert resource in {
            "profile_preferences",
            "follows",
            "community_members",
            "post_reactions",
            "event_rsvps",
            "saved_posts",
        }
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
        assert method == "POST"
        if resource == "rpc/contribution_scores":
            assert body == {"p_user_ids": [USER_ID]}
            return [{"user_id": USER_ID, "score": 23}]
        if resource == "rpc/complete_onboarding":
            assert set(body) == {"payload"}
            return {"id": USER_ID, **body["payload"]}
        assert resource == "rpc/community_update"
        assert set(body) == {"p_community_id", "p_data"}
        if self.community_update_error:
            raise SupabaseRestError(self.community_update_error, "private database detail")
        return {"id": body["p_community_id"], **body["p_data"]}


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
    assert result.json()["profile"]["contribution_score"] == 23
    selects = [call for call in client.calls if len(call) == 2]
    rpcs = [call for call in client.calls if len(call) == 3]
    assert len(client.calls) == 8
    assert {resource for resource, _ in selects} == {
        "profiles",
        "profile_preferences",
        "follows",
        "community_members",
        "post_reactions",
        "event_rsvps",
        "saved_posts",
    }
    assert len(selects) == 7
    for resource, filters in selects:
        key = (
            "id"
            if resource == "profiles"
            else "follower_id"
            if resource == "follows"
            else "user_id"
        )
        assert filters[key] == f"eq.{USER_ID}"
    assert rpcs == [("rpc/contribution_scores", {"method": "POST"}, {"p_user_ids": [USER_ID]})]
    assert result.json()["saved"] == []


def test_state_requires_authentication():
    with TestClient(app) as client:
        assert client.get("/api/v1/me/state").status_code == 401


def test_update_community_delegates_authorization_to_database_rpc(scoped):
    browser, client = scoped
    response = browser.patch(
        f"/api/v1/communities/{UUID(COMMUNITY_ID)}",
        json={"name": "Public community", "description": "A real description"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": COMMUNITY_ID,
        "name": "Public community",
        "description": "A real description",
    }
    assert client.calls == [
        (
            "rpc/community_update",
            {"method": "POST"},
            {
                "p_community_id": COMMUNITY_ID,
                "p_data": {"name": "Public community", "description": "A real description"},
            },
        )
    ]


@pytest.mark.parametrize("status_code", [403, 404])
def test_update_community_preserves_database_authorization_failures(scoped, status_code):
    browser, client = scoped
    client.community_update_error = status_code
    response = browser.patch(f"/api/v1/communities/{COMMUNITY_ID}", json={"name": "Community"})
    assert response.status_code == status_code
    assert "private database detail" not in response.text
    assert client.calls == [
        (
            "rpc/community_update",
            {"method": "POST"},
            {"p_community_id": COMMUNITY_ID, "p_data": {"name": "Community"}},
        )
    ]


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
    assert response.json()["contribution_score"] == 23
    assert client.calls == [
        ("profiles", {"select": "*", "id": f"eq.{USER_ID}"}),
        ("rpc/contribution_scores", {"method": "POST"}, {"p_user_ids": [USER_ID]}),
    ]


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
            assert response.json()["contribution_score"] == 23
            assert client.calls[0] == ("profiles", {"select": "*", "id": f"eq.{USER_ID}"})
            assert client.calls[1][0] == "profiles"
            assert client.calls[1][1]["id"] == USER_ID
            assert client.calls[2:] == [
                ("rpc/contribution_scores", {"method": "POST"}, {"p_user_ids": [USER_ID]})
            ]
    finally:
        app.dependency_overrides.clear()


def test_onboarding_persists_fields_for_current_user(scoped):
    browser, client = scoped

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
    assert response.json()["id"] == USER_ID
    assert response.json()["contribution_score"] == 23
    assert len(client.calls) == 2
    assert client.calls[0][0] == "rpc/complete_onboarding"
    assert client.calls[0][1] == {"method": "POST"}
    assert set(client.calls[0][2]) == {"payload"}
    assert "id" not in client.calls[0][2]["payload"]
    assert client.calls[0][2]["payload"]["headline"] == "Développeuse"
    assert client.calls[1] == (
        "rpc/contribution_scores",
        {"method": "POST"},
        {"p_user_ids": [USER_ID]},
    )


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
