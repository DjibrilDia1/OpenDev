from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.platform import ProjectCreate
from app.services.platform import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
async def list_projects(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await ProjectService(client).list_projects(limit, offset)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    project = await ProjectService(client).create(payload.model_dump(mode="json"), user.id)
    if project is None:
        raise HTTPException(status_code=502, detail="Project could not be created")
    return project


@router.get("/{slug}")
async def read_project(
    slug: Annotated[str, Path(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    project = await ProjectService(client).get(slug)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/contributors/me", status_code=status.HTTP_201_CREATED)
async def join_project(
    project_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await ProjectService(client).join(project_id, user.id)


@router.delete("/{project_id}/contributors/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_project(
    project_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> None:
    if not await ProjectService(client).leave(project_id, user.id):
        raise HTTPException(
            status_code=409,
            detail="Owner membership cannot be removed, or membership is already absent",
        )
