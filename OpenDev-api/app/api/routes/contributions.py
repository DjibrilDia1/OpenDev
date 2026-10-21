from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.contributions import (
    CommentThanksInput,
    CommentThanksResult,
    ContributionScore,
    PostSolutionInput,
    PostSolutionResult,
)
from app.services.contributions import ContributionService

router = APIRouter(tags=["contributions"])
User = Annotated[CurrentUser, Depends(get_current_user)]
Client = Annotated[SupabaseRestClient, Depends(get_supabase_client)]


@router.get("/people/{user_id}/score", response_model=ContributionScore)
async def read_contribution_score(user_id: UUID, client: Client):
    return await ContributionService(client).score(user_id)


@router.put("/posts/{post_id}/comments/{comment_id}/thanks", response_model=CommentThanksResult)
async def thank_comment(
    post_id: UUID, comment_id: UUID, payload: CommentThanksInput, user: User, client: Client
):
    return await ContributionService(client).thanks(post_id, comment_id, payload.tag)


@router.delete("/posts/{post_id}/comments/{comment_id}/thanks", response_model=CommentThanksResult)
async def remove_comment_thanks(post_id: UUID, comment_id: UUID, user: User, client: Client):
    return await ContributionService(client).thanks(post_id, comment_id, None)


@router.put("/posts/{post_id}/solution", response_model=PostSolutionResult)
async def set_post_solution(post_id: UUID, payload: PostSolutionInput, user: User, client: Client):
    return await ContributionService(client).solution(post_id, payload.comment_id)
