from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import AwareDatetime

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.services.saved_posts import SavedPostService

router = APIRouter(tags=["saved posts"])
User = Annotated[CurrentUser, Depends(get_current_user)]
Client = Annotated[SupabaseRestClient, Depends(get_supabase_client)]


@router.put("/posts/{post_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_post(post_id: UUID, user: User, client: Client) -> None:
    await SavedPostService(client).save(post_id)


@router.delete("/posts/{post_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_post(post_id: UUID, user: User, client: Client) -> None:
    await SavedPostService(client).remove(post_id, user.id)


@router.get("/me/saved-posts")
async def list_saved_posts(
    user: User,
    client: Client,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    before: Annotated[AwareDatetime | None, Query()] = None,
    before_id: UUID | None = None,
) -> list[dict[str, Any]]:
    if (before is None) != (before_id is None):
        raise HTTPException(status_code=422, detail="Supply both before and before_id")
    return await SavedPostService(client).page(before=before, before_id=before_id, limit=limit)
