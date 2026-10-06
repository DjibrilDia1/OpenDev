from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient
from app.services.platform import DiscoveryService

router = APIRouter(prefix="/discover", tags=["discovery"])


@router.get("/communities")
async def discover_communities(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    q: str | None = Query(default=None, max_length=80),
    tag: str | None = Query(default=None, pattern=r"^[a-z0-9-]{1,40}$"),
    sort: Literal["popular", "newest"] = "popular",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await DiscoveryService(client).communities(
        query=q, tag=tag, sort=sort, limit=limit, offset=offset
    )


@router.get("/projects")
async def discover_projects(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    q: str | None = Query(default=None, max_length=80),
    tag: str | None = Query(default=None, pattern=r"^[a-z0-9-]{1,40}$"),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await DiscoveryService(client).projects(query=q, tag=tag, limit=limit, offset=offset)


@router.get("/people")
async def discover_people(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
    q: str | None = Query(default=None, max_length=80),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await DiscoveryService(client).people(query=q, limit=limit, offset=offset)


@router.get("/tags")
async def discover_popular_tags(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
):
    return await DiscoveryService(client).posts()
