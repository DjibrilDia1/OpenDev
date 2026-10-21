from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CommentThanksInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tag: Literal["thanks", "helpful", "clear"]


class PostSolutionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment_id: UUID | None


class ContributionScore(BaseModel):
    user_id: UUID
    score: int = Field(ge=0)
    posts_points: int = Field(ge=0)
    answers_points: int = Field(ge=0)
    resources_points: int = Field(ge=0)
    thanks_points: int = Field(ge=0)
    solutions_points: int = Field(ge=0)
    thanks_received: int = Field(ge=0)
    solutions_count: int = Field(ge=0)


class CommentThanksResult(BaseModel):
    comment_id: UUID
    thanks_count: int = Field(ge=0)
    my_thanks_tag: Literal["thanks", "helpful", "clear"] | None
    is_solution: bool


class PostSolutionResult(BaseModel):
    post_id: UUID
    accepted_comment_id: UUID | None
