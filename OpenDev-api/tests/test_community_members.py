import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_supabase_client
from app.core.config import Settings, get_settings
from app.main import app

COMMUNITY_ID = "397c6719-2b6c-44cb-a698-f98aec9d60d7"
MEMBER_ID = "b043cb90-9652-455d-ad64-30a8435a757c"
PROJECTION = (
    "user_id,role,joined_at,permissions,profile:profiles!community_members_user_id_fkey("
    "id,username,full_name,headline,bio,avatar_url,tags,account_type,company_name)"
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
SCORES = [{"user_id": MEMBER_ID, "score": 37}]
SCORED_MEMBERS = [
    {**row, "profile": {**row["profile"], "contribution_score": 37}} for row in MEMBERS
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
        assert resource == "community_members"
        return self.members

    async def request(self, method, resource, *, body):
        self.calls.append((resource, {"method": method}, body))
        assert method == "POST"
        assert resource == "rpc/contribution_scores"
        assert body == {"p_user_ids": sorted({row["user_id"] for row in self.members})}
        return SCORES


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
    assert response.json() == SCORED_MEMBERS
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
        ("rpc/contribution_scores", {"method": "POST"}, {"p_user_ids": [MEMBER_ID]}),
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
    assert len(client.calls) == 2


def test_member_scores_are_batched_and_missing_scores_default_to_zero(scoped):
    browser, client = scoped
    other_id = "397c6719-2b6c-44cb-a698-f98aec9d60d7"
    other_member = {
        **MEMBERS[0],
        "user_id": other_id,
        "role": "member",
        "profile": {**MEMBERS[0]["profile"], "id": other_id, "username": "other-member"},
    }
    client.members = [MEMBERS[0], other_member]
    response = browser.get(f"/api/v1/communities/{COMMUNITY_ID}/members")
    assert response.status_code == 200
    assert response.json() == [
        SCORED_MEMBERS[0],
        {**other_member, "profile": {**other_member["profile"], "contribution_score": 0}},
    ]
    assert len(client.calls) == 3
    assert client.calls[-1] == (
        "rpc/contribution_scores",
        {"method": "POST"},
        {"p_user_ids": sorted([MEMBER_ID, other_id])},
    )


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
def test_public_read_preserves_request_identity_for_member_queries_and_score_rpc(token):
    upstream = []

    def handle(request):
        upstream.append(request)
        if request.url.path == "/rest/v1/communities":
            assert request.method == "GET"
            data = [{"id": COMMUNITY_ID}]
        elif request.url.path == "/rest/v1/community_members":
            assert request.method == "GET"
            data = MEMBERS
        else:
            assert request.url.path == "/rest/v1/rpc/contribution_scores"
            assert request.method == "POST"
            assert json.loads(request.content) == {"p_user_ids": [MEMBER_ID]}
            data = SCORES
        return httpx.Response(200, json=data)

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
        assert response.json() == SCORED_MEMBERS
        assert len(upstream) == 3
        for request in upstream:
            assert request.headers["apikey"] == "public-test-key"
            assert request.headers.get("Authorization") == (f"Bearer {token}" if token else None)
        assert upstream[1].url.params["community_id"] == f"eq.{COMMUNITY_ID}"
        assert upstream[1].url.params["select"] == PROJECTION
    finally:
        app.dependency_overrides.clear()
        asyncio.run(mock_http.aclose())
