from typing import Annotated, Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings

router = APIRouter(tags=["account"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase JWT validation is not configured")
    try:
        return jwt.decode(credentials.credentials, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc


@router.get("/me")
async def read_current_user(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> dict[str, Any]:
    return {"id": user.get("sub"), "role": user.get("role"), "email": user.get("email")}
