import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_supabase_client
from app.core.config import Settings, get_settings
from app.main import app

COMMUNITY_ID = "397c6719-2b6c-44cb-a698-f98aec9d60d7"
MEMBER_ID = "b043cb90-9652-455d-ad64-30a8435a757c"
PROJECTION = (
    "user_id,role,joined_at,profile:profiles!community_members_user_id_fkey("
    "id,username,full_name,headline,bio,avatar_url,tags)"
)
MEMBERS = [
    {
        "user_id": MEMBER_ID,
        "role": "owner",
        "joined_at": "2026-10-18T10:00:00Z",
        "profile": {
            "id": MEMBER_ID,
            "username": "opendev",
            "full_name": "OpenDev",
            "headline": "Administration",
            "bio": "",
            "avatar_url": None,
            "tags": [],
        },
    }
]


class MembersClient:
    def __init__(self):
        self.calls = []
        self.exists = True
        self.members = MEMBERS

    async def select(self, resource, params):
        self.calls.append((resource, params))
        if resource == "communities":
            return [{"id": COMMUNITY_ID}] if self.exists else []
        return self.members


@pytest.fixture
def scoped():
    client = MembersClient()
    app.dependency_overrides[get_supabase_client] = lambda: client
    try:
        with TestClient(app) as browser:
            yield browser, client
    finally:
        app.dependency_overrides.clear()


def test_public_members_read_is_scoped_and_projects_only_public_profile(scoped):
    browser, client = scoped
    response = browser.get(f"/api/v1/communities/{COMMUNITY_ID}/members?limit=7&offset=2")
    assert response.status_code == 200
    assert response.json() == MEMBERS
    assert client.calls == [
        ("communities", {"select": "id", "id": f"eq.{COMMUNITY_ID}", "limit": "1"}),
        (
            "community_members",
            {
                "select": PROJECTION,
                "community_id": f"eq.{COMMUNITY_ID}",
                "order": "joined_at.asc,user_id.asc",
                "limit": "7",
                "offset": "2",
            },
        ),
    ]
    assert "email" not in PROJECTION
    assert "preferences" not in PROJECTION


def test_existing_community_with_no_members_returns_empty_list(scoped):
    browser, client = scoped
    client.members = []
    response = browser.get(f"/api/v1/communities/{COMMUNITY_ID}/members")
    assert response.status_code == 200
    assert response.json() == []
    assert client.calls[1][1]["limit"] == "100"
    assert client.calls[1][1]["offset"] == "0"


def test_missing_community_returns_404_without_querying_members(scoped):
    browser, client = scoped
    client.exists = False
    response = browser.get(f"/api/v1/communities/{COMMUNITY_ID}/members")
    assert response.status_code == 404
    assert len(client.calls) == 1


@pytest.mark.parametrize(
    "path",
    [
        "invalid/members",
        f"{COMMUNITY_ID}/members?limit=0",
        f"{COMMUNITY_ID}/members?limit=101",
        f"{COMMUNITY_ID}/members?limit=invalid",
        f"{COMMUNITY_ID}/members?offset=-1",
    ],
)
def test_member_listing_validates_id_and_pagination_before_data_access(scoped, path):
    browser, client = scoped
    assert browser.get(f"/api/v1/communities/{path}").status_code == 422
    assert client.calls == []


@pytest.mark.parametrize("token", [None, "caller-access-token"])
def test_public_read_preserves_request_identity_for_both_supabase_queries(token):
    upstream = []

    def handle(request):
        upstream.append(request)
        return httpx.Response(
            200,
            json=[{"id": COMMUNITY_ID}] if request.url.path.endswith("/communities") else MEMBERS,
        )

    mock_http = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    settings = Settings(
        supabase_url="https://members-test.supabase.co",
        supabase_publishable_key="public-test-key",
    )
    app.dependency_overrides[get_settings] = lambda: settings
    try:
        with TestClient(app) as browser:
            original_http = app.state.http_client
            app.state.http_client = mock_http
            try:
                response = browser.get(
                    f"/api/v1/communities/{COMMUNITY_ID}/members",
                    headers={"Authorization": f"Bearer {token}"} if token else {},
                )
            finally:
                app.state.http_client = original_http
        assert response.status_code == 200
        assert len(upstream) == 2
        for request in upstream:
            assert request.headers["apikey"] == "public-test-key"
            assert request.headers.get("Authorization") == (f"Bearer {token}" if token else None)
        assert upstream[1].url.params["community_id"] == f"eq.{COMMUNITY_ID}"
        assert upstream[1].url.params["select"] == PROJECTION
    finally:
        app.dependency_overrides.clear()
        asyncio.run(mock_http.aclose())
