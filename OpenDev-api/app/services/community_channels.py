from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.repositories.supabase_rest import SupabaseRestClient


class CommunityChannelService:
    """Keep all channel operations bound to the requesting Supabase identity."""

    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def list(self, community_id: UUID, *, include_archived: bool) -> list[dict[str, Any]]:
        community = await self.client.select(
            "communities",
            {"select": "id", "id": f"eq.{community_id}", "archived_at": "is.null", "limit": "1"},
        )
        if not community:
            raise HTTPException(status_code=404, detail="Community not found")
        filters = {
            "select": "*",
            "community_id": f"eq.{community_id}",
            "order": "position.asc,created_at.asc,id.asc",
        }
        if not include_archived:
            filters["archived_at"] = "is.null"
        return await self.client.select("community_channels", filters)

    async def create(self, community_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/community_channel_create",
            body={"p_community_id": str(community_id), "p_data": data},
        )

    async def update(
        self, community_id: UUID, channel_id: UUID, data: dict[str, Any]
    ) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/community_channel_update",
            body={
                "p_community_id": str(community_id),
                "p_channel_id": str(channel_id),
                "p_data": data,
            },
        )

    async def delete(self, community_id: UUID, channel_id: UUID) -> None:
        await self.client.request(
            "POST",
            "rpc/community_channel_delete",
            body={"p_community_id": str(community_id), "p_channel_id": str(channel_id)},
        )
