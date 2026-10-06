from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, me
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, description="OpenDev business API with Supabase identity and data access.", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(me.router, prefix=settings.api_v1_prefix)
