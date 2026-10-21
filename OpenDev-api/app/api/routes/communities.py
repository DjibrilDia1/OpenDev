from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.community_admin import CommunityNotificationUpdate, MemberRoleUpdate
from app.schemas.community_channels import CommunityChannelCreate, CommunityChannelUpdate
from app.schemas.platform import CommunityCreate, CommunityUpdate
from app.services.community_admin import CommunityAdminService
from app.services.community_channels import CommunityChannelService
from app.services.platform import CommunityService

router = APIRouter(prefix="/communities", tags=["communities"])


@router.get("/{community_id}/channels")
async def list_community_channels(
    community_id: UUID,
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    return await CommunityChannelService(client).list(
        community_id, include_archived=include_archived
    )


@router.post("/{community_id}/channels", status_code=status.HTTP_201_CREATED)
async def create_community_channel(
    community_id: UUID,
    payload: CommunityChannelCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    return await CommunityChannelService(client).create(
        community_id, payload.model_dump(mode="json")
    )


@router.patch("/{community_id}/channels/{channel_id}")
async def update_community_channel(
    community_id: UUID,
    channel_id: UUID,
    payload: CommunityChannelUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    data = payload.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No channel fields provided")
    return await CommunityChannelService(client).update(community_id, channel_id, data)


@router.delete("/{community_id}/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community_channel(
    community_id: UUID,
    channel_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await CommunityChannelService(client).delete(community_id, channel_id)


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


@router.patch("/{community_id}")
async def update_community(
    community_id: UUID,
    payload: CommunityUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    data = payload.model_dump(mode="json", exclude_unset=True)
    if payload.resources is not None:
        # Keep per-resource defaults even though PATCH omits absent top-level fields.
        data["resources"] = [resource.model_dump(mode="json") for resource in payload.resources]
    if not data:
        raise HTTPException(status_code=400, detail="No community fields provided")
    return await CommunityAdminService(client).update(community_id, data)


@router.delete("/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    community_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await CommunityAdminService(client).delete(community_id)


@router.get("/{community_id}/permissions")
async def community_permissions(
    community_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await CommunityAdminService(client).permissions(community_id)


@router.patch("/{community_id}/members/{user_id}")
async def set_community_member(
    community_id: UUID,
    user_id: UUID,
    payload: MemberRoleUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await CommunityAdminService(client).set_member(
        community_id, user_id, role=payload.role, permissions=payload.permissions
    )


@router.delete("/{community_id}/members/{user_id:uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_community_member(
    community_id: UUID,
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await CommunityAdminService(client).remove_member(community_id, user_id)


@router.patch("/{community_id}/notifications")
async def community_notification_setting(
    community_id: UUID,
    payload: CommunityNotificationUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await CommunityAdminService(client).notifications(community_id, payload.enabled)


@router.post("/{community_id}/members/me", status_code=status.HTTP_201_CREATED)
async def join_community(
    community_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await CommunityService(client).join(community_id, user.id)


@router.get("/{community_id}/members")
async def list_community_members(
    community_id: UUID,
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(max_length=80)] = None,
    role: Literal["staff", "owner", "moderator", "member"] | None = None,
) -> list[dict[str, Any]]:
    members = await CommunityService(client).members(
        community_id, limit=limit, offset=offset, query=q, role=role
    )
    if members is None:
        raise HTTPException(status_code=404, detail="Community not found")
    return members


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
