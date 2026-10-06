from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.platform import EventCreate
from app.services.platform import EventService

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
async def list_events(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await EventService(client).list_events(limit, offset)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    try:
        event = await EventService(client).create(payload.model_dump(mode="json"), user.id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if event is None:
        raise HTTPException(status_code=502, detail="Event could not be created")
    return event


@router.get("/{event_id}")
async def read_event(
    event_id: UUID, client: Annotated[SupabaseRestClient, Depends(get_supabase_client)]
):
    event = await EventService(client).get(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/{event_id}/rsvps/me", status_code=status.HTTP_204_NO_CONTENT)
async def rsvp_to_event(
    event_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await EventService(client).rsvp(event_id, user.id)


@router.delete("/{event_id}/rsvps/me", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_event_rsvp(
    event_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await EventService(client).cancel_rsvp(event_id, user.id)
