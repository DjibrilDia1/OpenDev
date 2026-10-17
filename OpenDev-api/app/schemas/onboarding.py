from typing import Annotated

from pydantic import Field, StringConstraints

from app.schemas.platform import ApiModel, ProfileUpdate


class DraftData(ProfileUpdate):
    username: Annotated[str, StringConstraints(max_length=30)] | None = None
    # Drafts intentionally accept incomplete links while the person is typing.
    avatar_url: Annotated[str, StringConstraints(max_length=2048)] | None = None
    website_url: Annotated[str, StringConstraints(max_length=2048)] | None = None
    github_url: Annotated[str, StringConstraints(max_length=2048)] | None = None
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
