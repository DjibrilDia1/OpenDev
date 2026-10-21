from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.api.dependencies import CurrentUser, get_current_user, get_supabase_client
from app.repositories.supabase_rest import SupabaseRestClient, SupabaseRestError
from app.schemas.onboarding import OnboardingCatalog, OnboardingDraft
from app.schemas.platform import ProfileOnboarding, ProfileUpdate
from app.schemas.username import Username, username_filter
from app.services.contributions import ContributionService
from app.services.onboarding import OnboardingService
from app.services.saved_posts import SavedPostService

router = APIRouter(tags=["profiles"])


@router.get("/auth/options")
async def auth_options(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, bool]:
    response = await client.http.get(
        client.rest_url.removesuffix("/rest/v1") + "/auth/v1/settings",
        headers={"apikey": client.publishable_key},
    )
    if response.is_error:
        raise HTTPException(status_code=503, detail="Authentication options unavailable")
    external = response.json().get("external", {})
    return {"github": external.get("github") is True, "google": external.get("google") is True}


@router.get("/me/state")
async def read_my_state(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    # Every query retains the request token; no administrator client is used.
    profiles = await client.select("profiles", {"select": "*", "id": f"eq.{user.id}"})
    profiles = await ContributionService(client).enrich(profiles)

    try:
        preferences = next(
            iter(
                await client.select(
                    "profile_preferences", {"select": "interests", "user_id": f"eq.{user.id}"}
                )
            ),
            None,
        )
    except SupabaseRestError as exc:
        if exc.status_code == 404:
            preferences = None
        else:
            raise

    try:
        following = [
            row["followed_id"]
            for row in await client.select(
                "follows", {"select": "followed_id", "follower_id": f"eq.{user.id}"}
            )
        ]
    except SupabaseRestError as exc:
        if exc.status_code == 404:
            following = []
        else:
            raise

    return {
        "profile": profiles[0] if profiles else None,
        "preferences": preferences,
        "memberships": await client.select(
            "community_members", {"select": "*", "user_id": f"eq.{user.id}"}
        ),
        "likes": await client.select(
            "post_reactions", {"select": "post_id", "user_id": f"eq.{user.id}"}
        ),
        "rsvps": await client.select(
            "event_rsvps", {"select": "event_id", "user_id": f"eq.{user.id}"}
        ),
        "following": following,
        "saved": await SavedPostService(client).identities(user.id),
    }


@router.put("/profiles/me")
async def ensure_my_profile(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    rows = await client.select("profiles", {"select": "*", "id": f"eq.{user.id}"})
    if rows:
        return await ContributionService(client).enrich_profile(rows[0])
    # Also handles accounts registered before the profile trigger was installed.
    account_type = user.metadata.get("account_type", "individual")
    if not isinstance(account_type, str) or account_type not in ("individual", "company"):
        raise HTTPException(status_code=422, detail="Invalid account type")
    raw_company_name = user.metadata.get("company_name")
    if account_type == "company" and not isinstance(raw_company_name, str):
        raise HTTPException(status_code=422, detail="A company name is required")
    company_name = raw_company_name.strip() if isinstance(raw_company_name, str) else ""
    if account_type == "company" and not 1 <= len(company_name) <= 100:
        raise HTTPException(status_code=422, detail="A company name (1-100 characters) is required")
    profile = await client.insert(
        "profiles",
        {
            "id": user.id,
            "account_type": account_type,
            "company_name": company_name if account_type == "company" else None,
            "username": str(
                user.metadata.get("username") or ("dev_" + user.id.replace("-", "")[:24])
            )
            .strip()
            .lower(),
            "first_name": str(user.metadata.get("first_name") or "")[:50],
            "last_name": str(user.metadata.get("last_name") or "")[:50],
            "full_name": (
                company_name
                if account_type == "company"
                else str(user.metadata.get("full_name") or "Nouveau membre")[:100]
            ),
            "headline": str(user.metadata.get("headline") or "")[:140],
            "bio": str(user.metadata.get("bio") or "")[:1000],
            "location": str(user.metadata.get("location") or "")[:100],
        },
    )
    if profile is None:
        raise HTTPException(status_code=502, detail="Profile could not be created")
    return await ContributionService(client).enrich_profile(profile)


@router.get("/me")
async def read_current_user(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, Any]:
    return {"id": user.id, "email": user.email, "metadata": user.metadata}


@router.put("/profiles/me/onboarding")
async def complete_my_profile(
    payload: ProfileOnboarding,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    profile = await OnboardingService(client).complete(payload)
    return await ContributionService(client).enrich_profile(profile)


@router.get("/me/username-availability")
async def username_availability(
    username: Annotated[Username, Query()],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, bool]:
    return {"available": await OnboardingService(client).username_available(username, user.id)}


@router.get("/auth/username-availability")
async def signup_username_availability(
    username: Annotated[Username, Query()],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, bool]:
    return {"available": await OnboardingService(client).username_available(username)}


@router.get("/onboarding/catalog", response_model=OnboardingCatalog)
async def onboarding_catalog(
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    return await OnboardingService(client).catalog()


@router.get("/me/onboarding", response_model=OnboardingDraft | None)
async def onboarding_draft(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any] | None:
    return await OnboardingService(client).draft(user.id)


@router.put("/me/onboarding", response_model=OnboardingDraft)
async def save_onboarding_draft(
    payload: OnboardingDraft,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    return await OnboardingService(client).save_draft(user.id, payload)


@router.put("/profiles/{profile_id}/follow")
async def follow_profile(
    profile_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, bool]:
    return {"following": await OnboardingService(client).follow(user.id, str(profile_id), True)}


@router.delete("/profiles/{profile_id}/follow")
async def unfollow_profile(
    profile_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, bool]:
    return {"following": await OnboardingService(client).follow(user.id, str(profile_id), False)}


@router.get("/profiles/{username:path}")
async def read_profile(
    username: Annotated[Username, Path()],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    rows = await client.select(
        "profiles", {"select": "*", "username": username_filter(username), "limit": "1"}
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return await ContributionService(client).enrich_profile(rows[0])


@router.patch("/profiles/me")
async def update_my_profile(
    payload: ProfileUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[SupabaseRestClient, Depends(get_supabase_client)],
) -> dict[str, Any]:
    body = payload.model_dump(exclude_unset=True, mode="json")
    if not body:
        raise HTTPException(status_code=400, detail="No profile fields provided")
    if {"account_type", "company_name", "full_name"} & body.keys():
        current = await client.select("profiles", {"select": "*", "id": f"eq.{user.id}"})
        if not current:
            raise HTTPException(status_code=404, detail="Profile not found")
        account_type = body.get("account_type", current[0].get("account_type", "individual"))
        if account_type == "company":
            company_name = body.get("company_name", current[0].get("company_name"))
            if not company_name:
                raise HTTPException(status_code=422, detail="A company name is required")
            body["full_name"] = company_name
        else:
            body["company_name"] = None
    rows = await client.update("profiles", {"id": f"eq.{user.id}", "select": "*"}, body)
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return await ContributionService(client).enrich_profile(rows[0])
