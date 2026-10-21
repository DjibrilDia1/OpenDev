from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class CommunicationModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConversationStart(CommunicationModel):
    recipient_id: UUID


class MessageCreate(CommunicationModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    body: Annotated[str, Field(min_length=1, max_length=5000)]
    client_id: UUID


class ConversationRead(CommunicationModel):
    sequence: Annotated[int, Field(gt=0, strict=True)]


class NotificationsReadAll(CommunicationModel):
    before: AwareDatetime


class PublicActor(CommunicationModel):
    id: UUID
    username: str
    full_name: str
    avatar_url: str | None = None


class ConversationParticipant(PublicActor):
    headline: str = ""


class ConversationSummary(CommunicationModel):
    id: UUID
    participant: ConversationParticipant
    last_message: str | None = None
    last_message_at: AwareDatetime | None = None
    unread_count: Annotated[int, Field(ge=0)] = 0
    peer_read_sequence: Annotated[int, Field(ge=0)] = 0


class DirectMessage(CommunicationModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    body: str
    sequence: Annotated[int, Field(gt=0)]
    client_id: UUID
    created_at: AwareDatetime


class Notification(CommunicationModel):
    id: UUID
    kind: Literal[
        "message",
        "follow",
        "comment",
        "reaction",
        "event_created",
        "event_updated",
        "event_cancelled",
    ]
    actor: PublicActor | None = None
    conversation_id: UUID | None = None
    post_id: UUID | None = None
    event_id: UUID | None = None
    event_title: str | None = None
    community_id: UUID | None = None
    community_slug: str | None = None
    created_at: AwareDatetime
    read_at: AwareDatetime | None = None


class CommunicationCounts(CommunicationModel):
    messages_unread: Annotated[int, Field(ge=0)]
    notifications_unread: Annotated[int, Field(ge=0)]
