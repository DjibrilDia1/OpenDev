from collections.abc import Iterable
from typing import Any, Literal
from uuid import UUID

from fastapi import HTTPException

from app.repositories.supabase_rest import SupabaseRestClient


class ContributionService:
    """Read server-calculated reputation and preserve the caller's RLS identity."""

    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def scores(self, user_ids: Iterable[str]) -> dict[str, dict[str, Any]]:
        identities = sorted({str(UUID(str(value))) for value in user_ids if value})
        result: dict[str, dict[str, Any]] = {}
        # Keep the number of upstream requests proportional to pages, never to authors.
        for start in range(0, len(identities), 100):
            rows = await self.client.request(
                "POST",
                "rpc/contribution_scores",
                body={"p_user_ids": identities[start : start + 100]},
            )
            result.update({str(row["user_id"]): row for row in rows})
        return result

    async def score(self, user_id: UUID) -> dict[str, Any]:
        rows = await self.scores([str(user_id)])
        if str(user_id) not in rows:
            raise HTTPException(status_code=404, detail="Profile not found")
        return rows[str(user_id)]

    async def enrich(
        self,
        rows: list[dict[str, Any]],
        *,
        identity_key: str = "id",
        score_key: str = "contribution_score",
    ) -> list[dict[str, Any]]:
        scores = await self.scores(row[identity_key] for row in rows if row.get(identity_key))
        return [
            {**row, score_key: scores.get(str(row.get(identity_key)), {}).get("score", 0)}
            for row in rows
        ]

    async def enrich_profile(self, profile: dict[str, Any]) -> dict[str, Any]:
        return (await self.enrich([profile]))[0]

    async def enrich_posts(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return await self.enrich(rows, identity_key="author_id", score_key="author_score")

    async def thanks(
        self,
        post_id: UUID,
        comment_id: UUID,
        tag: Literal["thanks", "helpful", "clear"] | None,
    ) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/set_comment_thanks",
            body={"p_post_id": str(post_id), "p_comment_id": str(comment_id), "p_tag": tag},
        )

    async def solution(self, post_id: UUID, comment_id: UUID | None) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/set_post_solution",
            body={
                "p_post_id": str(post_id),
                "p_comment_id": str(comment_id) if comment_id else None,
            },
        )
