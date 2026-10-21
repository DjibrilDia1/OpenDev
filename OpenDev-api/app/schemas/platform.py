from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
    UrlConstraints,
    field_validator,
    model_validator,
)

from app.schemas.username import Username

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)]
Tag = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9-]{0,39}$", max_length=40)]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ProfileUpdate(ApiModel):
    account_type: Literal["individual", "company"] | None = None
    company_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None
    ) = None

    @model_validator(mode="after")
    def validate_account_identity(self) -> "ProfileUpdate":
        if "account_type" in self.model_fields_set and self.account_type is None:
            raise ValueError("account_type cannot be null")
        if self.account_type == "company" and not self.company_name:
            raise ValueError("A company name is required")
        return self

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

    username: Username | None = None
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
    account_type: Literal["individual", "company"] = "individual"
    company_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None
    ) = None
    first_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] = ""
    last_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] = ""
    company: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    school: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    experience_level: Literal["", "student", "junior", "intermediate", "senior", "lead"] = ""
    avatar_url: HttpUrl | None = None
    interests: list[Annotated[str, StringConstraints(min_length=1, max_length=60)]] = Field(
        min_length=1, max_length=8
    )
    username: Username
    tags: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    ] = Field(min_length=1, max_length=10)
    website_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    headline: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=140)]
    bio: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] = ""
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""

    @model_validator(mode="after")
    def validate_account_identity(self) -> "ProfileOnboarding":
        if self.account_type == "company":
            if not self.company_name:
                raise ValueError("A company name is required")
            self.full_name = self.company_name
            self.first_name = ""
            self.last_name = ""
            self.experience_level = ""
            self.company = ""
        else:
            if not self.first_name or not self.last_name or not self.full_name:
                raise ValueError("First name, last name and display name are required")
            self.company_name = None
        return self

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


CommunityCategory = Literal[
    "Frontend",
    "Backend",
    "Design",
    "Open source",
    "IA & Data",
    "DevOps",
    "Mobile",
    "Gaming",
    "Sécurité",
    "Contribution",
]
CommunityWebUrl = Annotated[HttpUrl, UrlConstraints(max_length=2048)]


class CommunityResource(ApiModel):
    title: ShortText
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = ""
    url: CommunityWebUrl


class CommunityCreate(ApiModel):
    name: ShortText
    slug: Slug
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
    ]
    tags: list[Tag] = Field(default_factory=list, max_length=8)
    category: CommunityCategory = "Open source"
    cover_url: CommunityWebUrl | None = None
    rules: Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)] = ""
    resources: list[CommunityResource] = Field(default_factory=list, max_length=6)


class CommunityUpdate(ApiModel):
    name: ShortText | None = None
    description: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
        | None
    ) = None
    category: CommunityCategory | None = None
    cover_url: CommunityWebUrl | None = None
    rules: Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)] | None = None
    resources: list[CommunityResource] | None = Field(default=None, max_length=6)

    @model_validator(mode="after")
    def reject_null_fields(self) -> "CommunityUpdate":
        for key in self.model_fields_set - {"cover_url"}:
            if getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self


class PostFileResource(ApiModel):
    kind: Literal["image", "document"]
    path: Annotated[
        str,
        StringConstraints(
            pattern=(
                r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/"
                r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
                r"\.(?:jpg|jpeg|png|webp|pdf|txt|md)$"
            )
        ),
    ]
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=180)]
    mime_type: Literal[
        "image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/markdown"
    ]
    size: Annotated[int, Field(strict=True, gt=0, le=10 * 1024 * 1024)]

    @model_validator(mode="after")
    def validate_file_type(self) -> "PostFileResource":
        allowed_extensions = {
            "image/jpeg": {"jpg", "jpeg"},
            "image/png": {"png"},
            "image/webp": {"webp"},
            "application/pdf": {"pdf"},
            "text/plain": {"txt"},
            "text/markdown": {"md"},
        }
        if self.path.rsplit(".", 1)[-1] not in allowed_extensions[self.mime_type]:
            raise ValueError("The file extension does not match its MIME type")
        if (self.kind == "image") != self.mime_type.startswith("image/"):
            raise ValueError("The resource kind does not match its MIME type")
        if self.kind == "image" and self.size > 5 * 1024 * 1024:
            raise ValueError("Images cannot exceed 5 MiB")
        return self


class PostLinkResource(ApiModel):
    kind: Literal["link"]
    url: Annotated[HttpUrl, UrlConstraints(max_length=2048)]
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=180)]


PostResource = Annotated[PostFileResource | PostLinkResource, Field(discriminator="kind")]


def _validate_post_resources(resources: list[PostResource]) -> list[PostResource]:
    if sum(item.kind == "image" for item in resources) > 4:
        raise ValueError("A post cannot contain more than 4 images")
    if sum(item.kind == "document" for item in resources) > 2:
        raise ValueError("A post cannot contain more than 2 documents")
    paths = [item.path for item in resources if isinstance(item, PostFileResource)]
    if len(paths) != len(set(paths)):
        raise ValueError("A file cannot be attached twice")
    return resources


class PostCreate(ApiModel):
    post_type: Literal["discussion", "question", "showcase", "resource"] = "discussion"
    title: ShortText
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12000)]
    community_id: UUID | None = None
    channel_id: UUID | None = None
    code_language: Annotated[str, StringConstraints(max_length=40)] | None = None
    code_snippet: Annotated[str, StringConstraints(max_length=8000)] | None = None
    tags: list[Tag] = Field(default_factory=list, max_length=8)
    resources: list[PostResource] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def validate_channel_community(self) -> "PostCreate":
        if self.channel_id is not None and self.community_id is None:
            raise ValueError("A channel requires a community")
        return self

    @field_validator("resources")
    @classmethod
    def validate_resources(cls, resources: list[PostResource]) -> list[PostResource]:
        return _validate_post_resources(resources)


class PostUpdate(ApiModel):
    channel_id: UUID | None = None
    title: ShortText | None = None
    body: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12000)]
        | None
    ) = None
    tags: list[Tag] | None = Field(default=None, max_length=8)
    resources: list[PostResource] | None = Field(default=None, max_length=6)

    @field_validator("resources")
    @classmethod
    def validate_resources(cls, resources: list[PostResource] | None) -> list[PostResource]:
        if resources is None:
            raise ValueError("resources cannot be null")
        return _validate_post_resources(resources)


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
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    format: Literal["online", "in_person"] = "online"
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None
    registration_url: Annotated[HttpUrl, UrlConstraints(max_length=2048)] | None = None
    community_id: UUID | None = None
    capacity: Annotated[int, Field(ge=1, le=100000, strict=True)] | None = None

    @model_validator(mode="after")
    def validate_schedule(self) -> "EventCreate":
        if self.starts_at <= datetime.now(UTC):
            raise ValueError("Event start must be in the future")
        if self.ends_at <= self.starts_at:
            raise ValueError("Event end must be after its start")
        if self.format == "in_person" and not self.location:
            raise ValueError("A location is required for in-person events")
        return self


class EventUpdate(EventCreate):
    """Complete event form; the database keeps community and organizer immutable."""
