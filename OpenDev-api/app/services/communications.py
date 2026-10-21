from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.repositories.supabase_rest import SupabaseRestClient


class CommunicationService:
    """Call atomic database operations with the request's Supabase identity."""

    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def _rpc(self, name: str, body: dict[str, Any] | None = None) -> Any:
        return await self.client.request("POST", f"rpc/{name}", body=body or {})

    async def conversations(self, *, limit: int, offset: int) -> list[dict[str, Any]]:
        return await self._rpc("messaging_conversations", {"p_limit": limit, "p_offset": offset})

    async def conversation(self, conversation_id: UUID) -> dict[str, Any]:
        result = await self._rpc(
            "messaging_conversation", {"p_conversation_id": str(conversation_id)}
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return result

    async def start(self, recipient_id: UUID) -> dict[str, Any]:
        return await self._rpc("messaging_start", {"p_recipient_id": str(recipient_id)})

    async def messages(
        self, conversation_id: UUID, *, before: int | None, limit: int
    ) -> list[dict[str, Any]]:
        await self.conversation(conversation_id)
        rows = await self._rpc(
            "messaging_messages",
            {"p_conversation_id": str(conversation_id), "p_before": before, "p_limit": limit},
        )
        # The database fetches the newest page efficiently; the UI displays it oldest first.
        return list(reversed(rows))

    async def send(self, conversation_id: UUID, *, body: str, client_id: UUID) -> dict[str, Any]:
        await self.conversation(conversation_id)
        return await self._rpc(
            "messaging_send",
            {
                "p_conversation_id": str(conversation_id),
                "p_body": body,
                "p_client_id": str(client_id),
            },
        )

    async def read(self, conversation_id: UUID, sequence: int) -> None:
        await self.conversation(conversation_id)
        await self._rpc(
            "messaging_read",
            {"p_conversation_id": str(conversation_id), "p_sequence": sequence},
        )

    async def notifications(
        self, *, before: datetime | None, before_id: UUID | None, limit: int
    ) -> list[dict[str, Any]]:
        return await self._rpc(
            "notification_list",
            {
                "p_before": before.isoformat() if before else None,
                "p_before_id": str(before_id) if before_id else None,
                "p_limit": limit,
            },
        )

    async def read_notification(self, notification_id: UUID) -> None:
        found = await self._rpc("notification_read", {"p_id": str(notification_id)})
        if not found:
            raise HTTPException(status_code=404, detail="Notification not found")

    async def read_all_notifications(self, before: datetime) -> None:
        await self._rpc("notification_read_all", {"p_before": before.isoformat()})

    async def counts(self) -> dict[str, Any]:
        return await self._rpc("communication_counts")
