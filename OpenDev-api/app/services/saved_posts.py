from datetime import datetime
from typing import Any
from uuid import UUID

from app.repositories.supabase_rest import SupabaseRestClient
from app.services.contributions import ContributionService


class SavedPostService:
    """Keep bookmarks private and execute every operation with the caller's JWT."""

    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def save(self, post_id: UUID) -> None:
        await self.client.request("POST", "rpc/saved_post_add", body={"p_post_id": str(post_id)})

    async def remove(self, post_id: UUID, user_id: str) -> None:
        await self.client.delete(
            "saved_posts", {"user_id": f"eq.{user_id}", "post_id": f"eq.{post_id}"}
        )

    async def page(
        self, *, before: datetime | None, before_id: UUID | None, limit: int
    ) -> list[dict[str, Any]]:
        rows = await self.client.request(
            "POST",
            "rpc/saved_post_page",
            body={
                "p_before": before.isoformat() if before else None,
                "p_before_id": str(before_id) if before_id else None,
                "p_limit": limit,
            },
        )
        posts = [row["post"] for row in rows if isinstance(row.get("post"), dict)]
        enriched = await ContributionService(self.client).enrich_posts(posts)
        by_id = {str(post["id"]): post for post in enriched}
        return [
            {**row, "post": by_id.get(str(row["post"]["id"]), row["post"])}
            if isinstance(row.get("post"), dict)
            else row
            for row in rows
        ]

    async def identities(self, user_id: str) -> list[dict[str, str]]:
        # Continue to an empty page so a PostgREST row cap cannot truncate the state.
        result: list[dict[str, str]] = []
        after: str | None = None
        while True:
            filters = {
                "select": "post_id",
                "user_id": f"eq.{user_id}",
                "order": "post_id.asc",
                "limit": "500",
            }
            if after is not None:
                filters["post_id"] = f"gt.{after}"
            rows = await self.client.select("saved_posts", filters)
            if not rows:
                return result
            result.extend({"post_id": row["post_id"]} for row in rows)
            after = rows[-1]["post_id"]
