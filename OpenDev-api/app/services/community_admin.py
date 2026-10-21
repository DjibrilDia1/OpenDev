from typing import Any
from uuid import UUID

from app.repositories.supabase_rest import SupabaseRestClient


class CommunityAdminService:
    """The database checks the caller's current membership on every mutation."""

    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def permissions(self, community_id: UUID) -> dict[str, Any]:
        return await self.client.request(
            "POST", "rpc/community_permissions", body={"p_community_id": str(community_id)}
        )

    async def update(self, community_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/community_update",
            body={"p_community_id": str(community_id), "p_data": data},
        )

    async def delete(self, community_id: UUID) -> None:
        await self.client.request(
            "POST", "rpc/community_delete", body={"p_community_id": str(community_id)}
        )

    async def set_member(
        self, community_id: UUID, user_id: UUID, *, role: str, permissions: list[str]
    ) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/community_set_member",
            body={
                "p_community_id": str(community_id),
                "p_user_id": str(user_id),
                "p_role": role,
                "p_permissions": permissions,
            },
        )

    async def remove_member(self, community_id: UUID, user_id: UUID) -> None:
        await self.client.request(
            "POST",
            "rpc/community_remove_member",
            body={"p_community_id": str(community_id), "p_user_id": str(user_id)},
        )

    async def notifications(self, community_id: UUID, enabled: bool) -> dict[str, Any]:
        return await self.client.request(
            "POST",
            "rpc/community_notification_setting",
            body={"p_community_id": str(community_id), "p_enabled": enabled},
        )
