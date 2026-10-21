from typing import Any

from fastapi import HTTPException

from app.repositories.supabase_rest import SupabaseRestClient, SupabaseRestError
from app.schemas.onboarding import OnboardingDraft
from app.schemas.platform import ProfileOnboarding
from app.schemas.username import username_filter


class OnboardingService:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def catalog(self) -> dict[str, Any]:
        technologies = await self.client.select(
            "technology_catalog", {"select": "name,category", "order": "category.asc,name.asc"}
        )
        interests = await self.client.select(
            "interest_catalog", {"select": "name", "order": "position.asc,name.asc"}
        )
        return {"technologies": technologies, "interests": [row["name"] for row in interests]}

    async def draft(self, user_id: str) -> dict[str, Any] | None:
        rows = await self.client.select(
            "onboarding_drafts", {"select": "step,data", "user_id": f"eq.{user_id}"}
        )
        return rows[0] if rows else None

    async def save_draft(self, user_id: str, payload: OnboardingDraft) -> dict[str, Any]:
        body = payload.model_dump(mode="json", exclude_unset=True)
        saved = await self.client.upsert(
            "onboarding_drafts", {"user_id": user_id, **body}, on_conflict="user_id"
        )
        if saved is None:
            raise HTTPException(status_code=502, detail="Progress could not be saved")
        return {"step": saved["step"], "data": saved["data"]}

    async def complete(self, payload: ProfileOnboarding) -> dict[str, Any]:
        # A single transaction, using the caller's token and invoker privileges.
        result = await self.client.request(
            "POST", "rpc/complete_onboarding", body={"payload": payload.model_dump(mode="json")}
        )
        if not isinstance(result, dict):
            raise HTTPException(status_code=502, detail="Profile could not be saved")
        return result

    async def username_available(self, username: str, user_id: str | None = None) -> bool:
        params = {"select": "id", "username": username_filter(username), "limit": "1"}
        if user_id:
            params["id"] = f"neq.{user_id}"
        return not await self.client.select("profiles", params)

    async def follow(self, user_id: str, target_id: str, following: bool) -> bool:
        if user_id == target_id:
            raise HTTPException(status_code=422, detail="You cannot follow yourself")
        filters = {"follower_id": f"eq.{user_id}", "followed_id": f"eq.{target_id}"}
        if not following:
            await self.client.delete("follows", filters)
            return False
        if not await self.client.select("profiles", {"select": "id", "id": f"eq.{target_id}"}):
            raise HTTPException(status_code=404, detail="Profile not found")
        try:
            await self.client.insert("follows", {"follower_id": user_id, "followed_id": target_id})
        except SupabaseRestError as exc:
            if exc.status_code != 409 or not await self.client.select("follows", filters):
                raise
        return True
