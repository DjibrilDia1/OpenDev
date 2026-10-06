import asyncio

import httpx
import pytest

from app.repositories.supabase_rest import SupabaseRestClient, SupabaseRestError


@pytest.mark.parametrize("token", [None, "user-access-token"])
def test_repository_preserves_user_identity_for_rls(token):
    async def exercise():
        def handle(request):
            assert request.headers["apikey"] == "sb_publishable_test"
            if token:
                assert request.headers["authorization"] == f"Bearer {token}"
            else:
                assert "authorization" not in request.headers
            return httpx.Response(200, json=[{"id": "post-id"}])

        async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as http:
            client = SupabaseRestClient(
                http=http,
                base_url="https://test.supabase.co",
                publishable_key="sb_publishable_test",
                access_token=token,
            )
            assert await client.select("posts", {"select": "id"}) == [{"id": "post-id"}]

    asyncio.run(exercise())


def test_repository_propagates_access_denied():
    async def exercise():
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(
                lambda _: httpx.Response(403, json={"message": "Access denied"})
            )
        ) as http:
            client = SupabaseRestClient(
                http=http,
                base_url="https://test.supabase.co",
                publishable_key="sb_publishable_test",
                access_token="user-access-token",
            )
            with pytest.raises(SupabaseRestError) as exc:
                await client.select("posts", {"select": "id"})
            assert exc.value.status_code == 403

    asyncio.run(exercise())
