from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.platform import CommentCreate, PostCreate, PostUpdate
from app.services.platform import PostService

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("")
async def list_posts(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    community_id: UUID | None = None,
    sort: Literal["latest", "popular"] = "latest",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await PostService(client).list_posts(
        community_id=community_id, sort=sort, limit=limit, offset=offset
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    post = await PostService(client).create(payload.model_dump(mode="json"), user.id)
    if post is None:
        raise HTTPException(status_code=502, detail="Post could not be created")
    return post


@router.get("/{post_id}")
async def read_post(
    post_id: UUID, client: Annotated[SupabaseRestClient, Depends(get_supabase_client)]
):
    post = await PostService(client).get(post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.patch("/{post_id}")
async def update_post(
    post_id: UUID,
    payload: PostUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    body = payload.model_dump(exclude_unset=True, mode="json")
    if not body:
        raise HTTPException(status_code=400, detail="No post fields provided")
    post = await PostService(client).update(post_id, body, user.id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found or not editable")
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    if not await PostService(client).delete(post_id, user.id):
        raise HTTPException(status_code=404, detail="Post not found or not editable")


@router.get("/{post_id}/comments")
async def list_comments(
    post_id: UUID,
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await PostService(client).comments(post_id, limit, offset)


@router.post("/{post_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: UUID,
    payload: CommentCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    try:
        comment = await PostService(client).add_comment(
            post_id, payload.model_dump(mode="json"), user.id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if comment is None:
        raise HTTPException(status_code=502, detail="Comment could not be created")
    return comment


@router.put("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def like_post(
    post_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await PostService(client).like(post_id, user.id)


@router.delete("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def unlike_post(
    post_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    await PostService(client).unlike(post_id, user.id)
