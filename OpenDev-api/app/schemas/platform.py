from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
    field_validator,
    model_validator,
)

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)]
Tag = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9-]{0,39}$", max_length=40)]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ProfileUpdate(ApiModel):
    first_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = (
        None
    )
    last_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = None
    company: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None
    school: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None
    experience_level: Literal["", "student", "junior", "intermediate", "senior", "lead"] | None = (
        None
    )
    tags: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    ] = Field(default_factory=list, max_length=10)
    cover_url: HttpUrl | None = None

    @field_validator("avatar_url", "website_url", "github_url", "cover_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("tags")
    @classmethod
    def unique_skills(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        result = []
        for value in values:
            if value.casefold() not in seen:
                seen.add(value.casefold())
                result.append(value)
        return result

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


class ProfileOnboarding(ApiModel):
    first_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)
    ]
    last_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
    company: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    school: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    experience_level: Literal["", "student", "junior", "intermediate", "senior", "lead"] = ""
    avatar_url: HttpUrl | None = None
    interests: list[Annotated[str, StringConstraints(min_length=1, max_length=60)]] = Field(
        min_length=1, max_length=8
    )
    username: Annotated[
        str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^[a-z0-9_.-]{3,30}$")
    ]
    tags: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    ] = Field(min_length=1, max_length=10)
    website_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    full_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
    ]
    headline: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=140)]
    bio: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] = ""
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""

    @field_validator("avatar_url", "website_url", "github_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("tags")
    @classmethod
    def unique_skills(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        result = []
        for value in values:
            if value.casefold() not in seen:
                seen.add(value.casefold())
                result.append(value)
        return result

    @field_validator("interests")
    @classmethod
    def unique_interests(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        result = []
        for value in values:
            if value.casefold() not in seen:
                seen.add(value.casefold())
                result.append(value)
        return result


class CommunityCreate(ApiModel):
    name: ShortText
    slug: Slug
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
    ]
    tags: list[Tag] = Field(default_factory=list, max_length=8)


class CommunityUpdate(ApiModel):
    name: ShortText
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
    ]


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
