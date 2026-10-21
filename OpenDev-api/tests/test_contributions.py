import asyncio
import json
from uuid import UUID

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.main import app
from app.repositories.supabase_rest import SupabaseRestClient, SupabaseRestError
from app.services.contributions import ContributionService

USER_ID = "b043cb90-9652-455d-ad64-30a8435a757c"
POST_ID = "397c6719-2b6c-44cb-a698-f98aec9d60d7"
COMMENT_ID = "17bc6055-53c2-4c68-8663-6b85cf82fba2"


def score_row(user_id):
    return {
        "user_id": user_id,
        "score": 27,
        "posts_points": 2,
        "answers_points": 2,
        "resources_points": 3,
        "thanks_points": 5,
        "solutions_points": 15,
        "thanks_received": 1,
        "solutions_count": 1,
    }


class ContributionClient:
    def __init__(self):
        self.calls = []
        self.error = None
        self.exists = True

    async def request(self, method, resource, *, body):
        self.calls.append((method, resource, body))
        if self.error:
            raise self.error
        if resource == "rpc/contribution_scores":
            return [score_row(user_id) for user_id in body["p_user_ids"]] if self.exists else []
        if resource == "rpc/set_comment_thanks":
            return {
                "comment_id": body["p_comment_id"],
                "thanks_count": 1 if body["p_tag"] else 0,
                "my_thanks_tag": body["p_tag"],
                "is_solution": False,
            }
        if resource == "rpc/set_post_solution":
            return {
                "post_id": body["p_post_id"],
                "accepted_comment_id": body["p_comment_id"],
            }
        raise AssertionError(f"Unexpected RPC: {resource}")


@pytest.fixture
def contribution_api():
    db = ContributionClient()
    app.dependency_overrides[get_supabase_client] = lambda: db
    try:
        with TestClient(app) as browser:
            yield browser, db
    finally:
        app.dependency_overrides.clear()


def authenticate():
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER_ID)


def test_score_is_public_and_uses_only_the_requested_profile(contribution_api):
    browser, db = contribution_api
    response = browser.get(f"/api/v1/people/{USER_ID}/score")
    assert response.status_code == 200
    assert response.json() == score_row(USER_ID)
    assert db.calls == [("POST", "rpc/contribution_scores", {"p_user_ids": [USER_ID]})]


def test_missing_profile_score_returns_404(contribution_api):
    browser, db = contribution_api
    db.exists = False
    assert browser.get(f"/api/v1/people/{USER_ID}/score").status_code == 404


@pytest.mark.parametrize("tag", ["thanks", "helpful", "clear"])
def test_gratitude_forwards_only_the_post_comment_and_tag(contribution_api, tag):
    browser, db = contribution_api
    authenticate()
    response = browser.put(
        f"/api/v1/posts/{POST_ID}/comments/{COMMENT_ID}/thanks", json={"tag": tag}
    )
    assert response.status_code == 200
    assert response.json()["my_thanks_tag"] == tag
    assert db.calls == [
        (
            "POST",
            "rpc/set_comment_thanks",
            {"p_post_id": POST_ID, "p_comment_id": COMMENT_ID, "p_tag": tag},
        )
    ]


def test_remove_gratitude_sends_a_null_tag(contribution_api):
    browser, db = contribution_api
    authenticate()
    response = browser.delete(f"/api/v1/posts/{POST_ID}/comments/{COMMENT_ID}/thanks")
    assert response.status_code == 200
    assert response.json()["my_thanks_tag"] is None
    assert db.calls[0][2] == {
        "p_post_id": POST_ID,
        "p_comment_id": COMMENT_ID,
        "p_tag": None,
    }


@pytest.mark.parametrize("comment_id", [COMMENT_ID, None])
def test_solution_selection_and_removal_are_scoped_to_the_post(contribution_api, comment_id):
    browser, db = contribution_api
    authenticate()
    response = browser.put(f"/api/v1/posts/{POST_ID}/solution", json={"comment_id": comment_id})
    assert response.status_code == 200
    assert response.json() == {"post_id": POST_ID, "accepted_comment_id": comment_id}
    assert db.calls == [
        (
            "POST",
            "rpc/set_post_solution",
            {"p_post_id": POST_ID, "p_comment_id": comment_id},
        )
    ]


@pytest.mark.parametrize(
    "path,payload",
    [
        (f"posts/{POST_ID}/comments/{COMMENT_ID}/thanks", {"tag": "admin"}),
        (f"posts/{POST_ID}/comments/{COMMENT_ID}/thanks", {"tag": "thanks", "user_id": USER_ID}),
        (f"posts/{POST_ID}/solution", {"comment_id": "invalid"}),
        (f"posts/{POST_ID}/solution", {"comment_id": None, "score": 999}),
        (f"posts/{POST_ID}/solution", {}),
    ],
)
def test_recognition_rejects_invalid_or_privileged_payloads(contribution_api, path, payload):
    browser, db = contribution_api
    authenticate()
    assert browser.put(f"/api/v1/{path}", json=payload).status_code == 422
    assert db.calls == []


@pytest.mark.parametrize(
    "method,path,payload",
    [
        ("PUT", f"posts/{POST_ID}/comments/{COMMENT_ID}/thanks", {"tag": "thanks"}),
        ("DELETE", f"posts/{POST_ID}/comments/{COMMENT_ID}/thanks", None),
        ("PUT", f"posts/{POST_ID}/solution", {"comment_id": COMMENT_ID}),
    ],
)
def test_recognition_requires_authentication(contribution_api, method, path, payload):
    browser, db = contribution_api
    assert browser.request(method, f"/api/v1/{path}", json=payload).status_code == 401
    assert db.calls == []


@pytest.mark.parametrize("code", [403, 409])
def test_database_permission_errors_are_preserved_without_leaking_details(contribution_api, code):
    browser, db = contribution_api
    authenticate()
    db.error = SupabaseRestError(code, "private upstream details")
    response = browser.put(f"/api/v1/posts/{POST_ID}/solution", json={"comment_id": COMMENT_ID})
    assert response.status_code == code
    assert "upstream" not in response.text


def test_score_errors_are_not_silently_replaced_with_zero(contribution_api):
    browser, db = contribution_api
    db.error = SupabaseRestError(503, "private upstream details")
    response = browser.get(f"/api/v1/people/{USER_ID}/score")
    assert response.status_code == 502
    assert "score" not in response.json()


def test_scores_are_deduplicated_and_batched_by_one_hundred():
    async def exercise():
        db = ContributionClient()
        identities = [str(UUID(int=index)) for index in range(1, 106)]
        result = await ContributionService(db).scores(identities + identities[:3])
        assert len(result) == 105
        assert [len(body["p_user_ids"]) for _, _, body in db.calls] == [100, 5]
        assert [item for _, _, body in db.calls for item in body["p_user_ids"]] == sorted(
            identities
        )
        db.calls.clear()
        assert await ContributionService(db).scores([]) == {}
        assert db.calls == []

    asyncio.run(exercise())


@pytest.mark.parametrize("token", [None, "caller-access-token"])
def test_score_and_recognition_rpcs_preserve_the_request_identity(token):
    async def exercise():
        requests = []

        def handle(request):
            requests.append(request)
            assert request.headers["apikey"] == "public-test-key"
            assert request.headers.get("Authorization") == (f"Bearer {token}" if token else None)
            body = json.loads(request.content)
            assert "user_id" not in body and "score" not in body
            if request.url.path.endswith("/contribution_scores"):
                return httpx.Response(200, json=[score_row(USER_ID)])
            return httpx.Response(200, json={"post_id": POST_ID, "accepted_comment_id": None})

        async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as http:
            db = SupabaseRestClient(
                http=http,
                base_url="https://score-test.supabase.co",
                publishable_key="public-test-key",
                access_token=token,
            )
            service = ContributionService(db)
            assert (await service.score(UUID(USER_ID)))["score"] == 27
            await service.thanks(UUID(POST_ID), UUID(COMMENT_ID), "thanks")
            await service.solution(UUID(POST_ID), None)
        assert len(requests) == 3
        assert all(request.method == "POST" for request in requests)
        assert json.loads(requests[1].content) == {
            "p_post_id": POST_ID,
            "p_comment_id": COMMENT_ID,
            "p_tag": "thanks",
        }

    asyncio.run(exercise())
