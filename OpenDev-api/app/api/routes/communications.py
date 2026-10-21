from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import AwareDatetime

from app.api.dependencies import get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.communications import (
    CommunicationCounts,
    ConversationRead,
    ConversationStart,
    ConversationSummary,
    DirectMessage,
    MessageCreate,
    Notification,
    NotificationsReadAll,
)
from app.services.communications import CommunicationService

router = APIRouter(tags=["communications"], dependencies=[Depends(get_current_user)])
Client = Annotated[SupabaseRestClient, Depends(get_supabase_client)]
PageLimit = Annotated[int, Query(ge=1, le=100)]


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    client: Client, limit: PageLimit = 50, offset: Annotated[int, Query(ge=0)] = 0
):
    return await CommunicationService(client).conversations(limit=limit, offset=offset)


@router.post(
    "/conversations", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED
)
async def start_conversation(payload: ConversationStart, client: Client):
    return await CommunicationService(client).start(payload.recipient_id)


@router.get("/conversations/{conversation_id}", response_model=ConversationSummary)
async def read_conversation(conversation_id: UUID, client: Client):
    return await CommunicationService(client).conversation(conversation_id)


@router.get("/conversations/{conversation_id}/messages", response_model=list[DirectMessage])
async def list_messages(
    conversation_id: UUID,
    client: Client,
    before: Annotated[int | None, Query(gt=0)] = None,
    limit: PageLimit = 50,
):
    return await CommunicationService(client).messages(conversation_id, before=before, limit=limit)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=DirectMessage,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(conversation_id: UUID, payload: MessageCreate, client: Client):
    return await CommunicationService(client).send(
        conversation_id, body=payload.body, client_id=payload.client_id
    )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_conversation_read(
    conversation_id: UUID, payload: ConversationRead, client: Client
) -> None:
    await CommunicationService(client).read(conversation_id, payload.sequence)


@router.get("/notifications", response_model=list[Notification])
async def list_notifications(
    client: Client,
    before: Annotated[AwareDatetime | None, Query()] = None,
    before_id: UUID | None = None,
    limit: PageLimit = 50,
):
    if (before_id is None) != (before is None):
        raise HTTPException(status_code=422, detail="Supply both before and before_id")
    return await CommunicationService(client).notifications(
        before=before, before_id=before_id, limit=limit
    )


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(payload: NotificationsReadAll, client: Client) -> None:
    await CommunicationService(client).read_all_notifications(payload.before)


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(notification_id: UUID, client: Client) -> None:
    await CommunicationService(client).read_notification(notification_id)


@router.get("/communications/counts", response_model=CommunicationCounts)
async def read_communication_counts(client: Client):
    return await CommunicationService(client).counts()
