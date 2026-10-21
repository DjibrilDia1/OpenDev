from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.schemas.platform import ApiModel


class DraftData(ApiModel):
    """Loose schema for in-progress onboarding drafts.

    Inherits from ``ApiModel`` rather than ``ProfileUpdate`` so that URL
    fields can be plain strings — drafts intentionally accept incomplete
    links while the person is still typing.
    """

    model_config = ApiModel.model_config.copy()
    model_config["extra"] = "ignore"  # tolerate stale keys from earlier draft versions

    # ── identity ──────────────────────────────────────────────────────
    account_type: Literal["individual", "company"] | None = None
    company_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None
    ) = None
    username: Annotated[str, StringConstraints(max_length=30)] | None = None
    first_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = (
        None
    )
    last_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = None
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = (
        None
    )
    headline: Annotated[str, StringConstraints(strip_whitespace=True, max_length=140)] | None = None
    bio: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None

    # ── professional ──────────────────────────────────────────────────
    company: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None
    school: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None
    experience_level: Literal["", "student", "junior", "intermediate", "senior", "lead"] | None = (
        None
    )
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None

    # ── urls (plain strings — no HttpUrl validation for drafts) ───────
    avatar_url: Annotated[str, StringConstraints(max_length=2048)] | None = None
    website_url: Annotated[str, StringConstraints(max_length=2048)] | None = None
    github_url: Annotated[str, StringConstraints(max_length=2048)] | None = None
    cover_url: Annotated[str, StringConstraints(max_length=2048)] | None = None

    # ── tags & interests ──────────────────────────────────────────────
    tags: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    ] = Field(default_factory=list, max_length=10)
    interests: list[Annotated[str, StringConstraints(min_length=1, max_length=60)]] = Field(
        default_factory=list, max_length=8
    )


class OnboardingDraft(ApiModel):
    step: int = Field(ge=0, le=5)
    data: DraftData


class Technology(ApiModel):
    name: str
    category: str


class OnboardingCatalog(ApiModel):
    technologies: list[Technology]
    interests: list[str]
