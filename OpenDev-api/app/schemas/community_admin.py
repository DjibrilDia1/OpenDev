from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

CommunityPermission = Literal["edit_community", "manage_members", "moderate_posts", "manage_events"]


class MemberRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["member", "moderator"]
    permissions: list[CommunityPermission] = Field(default_factory=list, max_length=4)

    @model_validator(mode="after")
    def validate_permissions(self) -> "MemberRoleUpdate":
        if len(set(self.permissions)) != len(self.permissions):
            raise ValueError("Permissions must be unique")
        if self.role == "member" and self.permissions:
            raise ValueError("Only moderators can receive delegated permissions")
        return self


class CommunityNotificationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(strict=True)
