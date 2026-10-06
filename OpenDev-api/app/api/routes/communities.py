from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.platform import CommunityCreate
from app.services.platform import CommunityService

router = APIRouter(prefix="/communities", tags=["communities"])


@router.get("/{slug}")
async def read_community(
    slug: Annotated[str, Path(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    community = await CommunityService(client).get(slug)
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    return community


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_community(
    payload: CommunityCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    community = await CommunityService(client).create(payload.model_dump(mode="json"), user.id)
    if community is None:
        raise HTTPException(status_code=502, detail="Community could not be created")
    return community


@router.post("/{community_id}/members/me", status_code=status.HTTP_201_CREATED)
async def join_community(
    community_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await CommunityService(client).join(community_id, user.id)


@router.delete("/{community_id}/members/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_community(
    community_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    left = await CommunityService(client).leave(community_id, user.id)
    if not left:
        raise HTTPException(
            status_code=409,
            detail="Owner membership cannot be removed, or membership is already absent",
        )
