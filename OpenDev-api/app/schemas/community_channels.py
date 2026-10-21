from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from app.schemas.platform import ApiModel

ChannelName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
ChannelDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=240)]


class CommunityChannelCreate(ApiModel):
    name: ChannelName
    description: ChannelDescription = ""
    position: int = Field(default=0, ge=0, le=1000, strict=True)
    is_read_only: bool = Field(default=False, strict=True)


class CommunityChannelUpdate(ApiModel):
    name: ChannelName | None = None
    description: ChannelDescription | None = None
    position: int | None = Field(default=None, ge=0, le=1000, strict=True)
    is_read_only: bool | None = Field(default=None, strict=True)
    archived: bool | None = Field(default=None, strict=True)

    @model_validator(mode="after")
    def reject_null_fields(self) -> "CommunityChannelUpdate":
        for key in self.model_fields_set:
            if getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self
