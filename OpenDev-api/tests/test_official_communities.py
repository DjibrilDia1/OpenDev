from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.main import app


@pytest.fixture
def official_api():
    class DataClient:
        def __init__(self):
            self.calls = []

        async def select(self, resource, filters):
            self.calls.append((resource, filters))
            return [
                {
                    "id": "community",
                    "slug": "react",
                    "name": "React",
                    "created_by": "owner",
                    "is_official": True,
                    "category": "Frontend",
                    "tags": ["react"],
                    "member_count": 1,
                }
            ]

    db = DataClient()
    app.dependency_overrides[get_supabase_client] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=str(uuid4()))
    try:
        with TestClient(app) as client:
            yield client, db
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("kind,expected", [("official", "eq.true"), ("member", "eq.false")])
def test_discovery_filters_official_status_in_database(official_api, kind, expected):
    client, db = official_api
    response = client.get(f"/api/v1/discover/communities?kind={kind}&tag=react")
    assert response.status_code == 200
    assert response.json()[0]["created_by"] == "owner"
    resource, filters = db.calls[0]
    assert resource == "community_directory"
    assert filters["is_official"] == expected
    assert filters["tags"] == "cs.{react}"
    assert {"created_by", "is_official", "category"} <= set(filters["select"].split(","))


def test_discovery_keeps_all_community_types_by_default(official_api):
    client, db = official_api
    assert client.get("/api/v1/discover/communities").status_code == 200
    assert "is_official" not in db.calls[0][1]


def test_member_cannot_request_official_status_on_creation(official_api):
    client, db = official_api
    response = client.post(
        "/api/v1/communities",
        json={
            "name": "Spoof",
            "slug": "spoof",
            "description": "Not an official community",
            "is_official": True,
        },
    )
    assert response.status_code == 422
    assert db.calls == []


def test_discovery_rejects_unknown_community_type(official_api):
    client, db = official_api
    assert client.get("/api/v1/discover/communities?kind=admin").status_code == 422
    assert db.calls == []
