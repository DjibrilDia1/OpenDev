from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.schemas.platform import ProfileUpdate

router = APIRouter(tags=["profiles"])


@router.get("/me")
async def read_current_user(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, Any]:
    return {"id": user.id, "email": user.email, "metadata": user.metadata}


@router.get("/profiles/{username}")
async def read_profile(
    username: Annotated[str, Path(pattern=r"^[A-Za-z0-9_.-]{3,30}$")],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    rows = await client.select(
        "profiles", {"select": "*", "username": f"eq.{username}", "limit": "1"}
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return rows[0]


@router.patch("/profiles/me")
async def update_my_profile(
    payload: ProfileUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    body = payload.model_dump(exclude_unset=True, mode="json")
    if not body:
        raise HTTPException(status_code=400, detail="No profile fields provided")
    rows = await client.update("profiles", {"id": f"eq.{user.id}", "select": "*"}, body)
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return rows[0]
