from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)]
Tag = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9-]{0,39}$", max_length=40)]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ProfileUpdate(ApiModel):
    username: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_.-]{3,30}$")] | None = None
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = (
        None
    )
    headline: Annotated[str, StringConstraints(strip_whitespace=True, max_length=140)] | None = None
    bio: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None
    avatar_url: HttpUrl | None = None
    website_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None


class CommunityCreate(ApiModel):
    name: ShortText
    slug: Slug
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
    ]
    tags: list[Tag] = Field(default_factory=list, max_length=8)


class PostCreate(ApiModel):
    post_type: Literal["discussion", "question", "showcase"] = "discussion"
    title: ShortText
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12000)]
    community_id: UUID | None = None
    code_language: Annotated[str, StringConstraints(max_length=40)] | None = None
    code_snippet: Annotated[str, StringConstraints(max_length=8000)] | None = None
    tags: list[Tag] = Field(default_factory=list, max_length=8)


class PostUpdate(ApiModel):
    title: ShortText | None = None
    body: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12000)]
        | None
    ) = None
    tags: list[Tag] | None = Field(default=None, max_length=8)


class CommentCreate(ApiModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
    parent_comment_id: UUID | None = None


class ProjectCreate(ApiModel):
    name: ShortText
    slug: Slug
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
    ]
    repository_url: HttpUrl | None = None
    website_url: HttpUrl | None = None
    status: Literal["active", "looking_for_contributors", "paused"] = "looking_for_contributors"
    tags: list[Tag] = Field(default_factory=list, max_length=8)


class EventCreate(ApiModel):
    title: ShortText
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
    ]
    starts_at: datetime
    ends_at: datetime
    format: Literal["online", "in_person"] = "online"
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None
    registration_url: HttpUrl | None = None
    community_id: UUID | None = None

    @model_validator(mode="after")
    def validate_schedule(self) -> "EventCreate":
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Event dates must include a timezone")
        if self.ends_at <= self.starts_at:
            raise ValueError("Event end must be after its start")
        if self.format == "in_person" and not self.location:
            raise ValueError("A location is required for in-person events")
        return self
