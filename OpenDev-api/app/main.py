from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import communities, discovery, events, health, me, posts, projects
from app.core.config import get_settings
from app.repositories.supabase_rest import SupabaseRestError

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with httpx.AsyncClient(timeout=settings.http_timeout_seconds) as http_client:
        app.state.http_client = http_client
        yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "OpenDev business API. Supabase Auth and RLS remain authoritative "
        "for identity and data access."
    ),
    version="0.2.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(SupabaseRestError)
async def handle_supabase_error(_: Request, exc: SupabaseRestError) -> JSONResponse:
    if exc.status_code in (400, 401, 403, 404, 409, 422):
        code = exc.status_code
        detail = exc.detail
    else:
        code = 502
        detail = "Supabase Data API request failed"
    return JSONResponse(status_code=code, content={"detail": detail})


for router in (
    health.router,
    me.router,
    discovery.router,
    communities.router,
    posts.router,
    projects.router,
    events.router,
):
    app.include_router(router, prefix=settings.api_v1_prefix)
