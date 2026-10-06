import re
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from app.repositories.supabase_rest import SupabaseRestClient


def _page(limit: int, offset: int, order: str) -> dict[str, str]:
    return {"select": "*", "order": order, "limit": str(limit), "offset": str(offset)}


def _safe_search(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"[^\w\s.-]", "", value, flags=re.UNICODE).strip()[:80]
    return cleaned or None


class DiscoveryService:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def communities(
        self,
        *,
        query: str | None,
        tag: str | None,
        sort: Literal["popular", "newest"],
        limit: int,
        offset: int,
    ) -> list[dict[str, Any]]:
        params = _page(
            limit, offset, "member_count.desc,name.asc" if sort == "popular" else "created_at.desc"
        )
        params["select"] = "id,slug,name,description,tags,created_at,member_count"
        search = _safe_search(query)
        if search:
            params["or"] = f"(name.ilike.*{search}*,description.ilike.*{search}*)"
        if tag:
            params["tags"] = f"cs.{{{tag}}}"
        return await self.client.select("community_directory", params)

    async def projects(
        self, *, query: str | None, tag: str | None, limit: int, offset: int
    ) -> list[dict[str, Any]]:
        params = _page(limit, offset, "contributor_count.desc,created_at.desc")
        params["select"] = (
            "id,slug,name,description,repository_url,website_url,status,tags,created_at,contributor_count"
        )
        search = _safe_search(query)
        if search:
            params["or"] = f"(name.ilike.*{search}*,description.ilike.*{search}*)"
        if tag:
            params["tags"] = f"cs.{{{tag}}}"
        params["status"] = "neq.paused"
        return await self.client.select("project_directory", params)

    async def people(self, *, query: str | None, limit: int, offset: int) -> list[dict[str, Any]]:
        params = _page(limit, offset, "post_count.desc,username.asc")
        params["select"] = (
            "id,username,full_name,headline,bio,avatar_url,location,post_count,community_count"
        )
        search = _safe_search(query)
        if search:
            params["or"] = (
                f"(username.ilike.*{search}*,full_name.ilike.*{search}*,headline.ilike.*{search}*)"
            )
        return await self.client.select("people_directory", params)

    async def posts(self, *, limit: int = 8) -> list[dict[str, Any]]:
        return await self.client.select(
            "popular_tags",
            {"select": "tag,post_count", "order": "post_count.desc,tag.asc", "limit": str(limit)},
        )


class CommunityService:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def get(self, slug: str) -> dict[str, Any] | None:
        rows = await self.client.select(
            "community_directory", {"select": "*", "slug": f"eq.{slug}", "limit": "1"}
        )
        return rows[0] if rows else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        return await self.client.insert("communities", {**data, "created_by": user_id})

    async def join(self, community_id: UUID, user_id: str) -> dict[str, Any] | None:
        current = await self.client.select(
            "community_members",
            {
                "select": "community_id,user_id,role,joined_at",
                "community_id": f"eq.{community_id}",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if current:
            return current[0]
        return await self.client.insert(
            "community_members",
            {"community_id": str(community_id), "user_id": user_id, "role": "member"},
        )

    async def leave(self, community_id: UUID, user_id: str) -> bool:
        community = await self.client.select(
            "communities", {"select": "created_by", "id": f"eq.{community_id}", "limit": "1"}
        )
        if community and community[0]["created_by"] == user_id:
            return False
        rows = await self.client.delete(
            "community_members",
            {"community_id": f"eq.{community_id}", "user_id": f"eq.{user_id}", "select": "user_id"},
        )
        return bool(rows)


class PostService:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def list_posts(
        self,
        *,
        community_id: UUID | None,
        sort: Literal["latest", "popular"],
        limit: int,
        offset: int,
    ) -> list[dict[str, Any]]:
        params = _page(
            limit,
            offset,
            "like_count.desc,created_at.desc" if sort == "popular" else "created_at.desc",
        )
        params["select"] = "*"
        if community_id:
            params["community_id"] = f"eq.{community_id}"
        return await self.client.select("post_directory", params)

    async def get(self, post_id: UUID) -> dict[str, Any] | None:
        rows = await self.client.select(
            "post_directory", {"select": "*", "id": f"eq.{post_id}", "limit": "1"}
        )
        return rows[0] if rows else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        return await self.client.insert("posts", {**data, "author_id": user_id})

    async def update(
        self, post_id: UUID, data: dict[str, Any], user_id: str
    ) -> dict[str, Any] | None:
        rows = await self.client.update(
            "posts", {"id": f"eq.{post_id}", "author_id": f"eq.{user_id}", "select": "*"}, data
        )
        return rows[0] if rows else None

    async def delete(self, post_id: UUID, user_id: str) -> bool:
        rows = await self.client.delete(
            "posts", {"id": f"eq.{post_id}", "author_id": f"eq.{user_id}", "select": "id"}
        )
        return bool(rows)

    async def comments(self, post_id: UUID, limit: int, offset: int) -> list[dict[str, Any]]:
        return await self.client.select(
            "comments", {**_page(limit, offset, "created_at.asc"), "post_id": f"eq.{post_id}"}
        )

    async def add_comment(
        self, post_id: UUID, data: dict[str, Any], user_id: str
    ) -> dict[str, Any] | None:
        parent_id = data.get("parent_comment_id")
        if parent_id:
            parent = await self.client.select(
                "comments",
                {"select": "id", "id": f"eq.{parent_id}", "post_id": f"eq.{post_id}", "limit": "1"},
            )
            if not parent:
                raise ValueError("Parent comment must belong to this post")
        return await self.client.insert(
            "comments", {**data, "post_id": str(post_id), "author_id": user_id}
        )

    async def like(self, post_id: UUID, user_id: str) -> dict[str, Any] | None:
        return await self.client.upsert(
            "post_reactions",
            {"post_id": str(post_id), "user_id": user_id, "reaction": "like"},
            on_conflict="post_id,user_id",
        )

    async def unlike(self, post_id: UUID, user_id: str) -> bool:
        rows = await self.client.delete(
            "post_reactions",
            {"post_id": f"eq.{post_id}", "user_id": f"eq.{user_id}", "select": "post_id"},
        )
        return bool(rows)


class ProjectService:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def list_projects(self, limit: int, offset: int) -> list[dict[str, Any]]:
        return await self.client.select(
            "project_directory", {**_page(limit, offset, "created_at.desc"), "status": "neq.paused"}
        )

    async def get(self, slug: str) -> dict[str, Any] | None:
        rows = await self.client.select(
            "project_directory", {"select": "*", "slug": f"eq.{slug}", "limit": "1"}
        )
        return rows[0] if rows else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        return await self.client.insert("projects", {**data, "owner_id": user_id})

    async def join(self, project_id: UUID, user_id: str) -> dict[str, Any] | None:
        current = await self.client.select(
            "project_contributors",
            {
                "select": "project_id,user_id,role,created_at",
                "project_id": f"eq.{project_id}",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if current:
            return current[0]
        return await self.client.insert(
            "project_contributors",
            {"project_id": str(project_id), "user_id": user_id, "role": "contributor"},
        )

    async def leave(self, project_id: UUID, user_id: str) -> bool:
        project = await self.client.select(
            "projects", {"select": "owner_id", "id": f"eq.{project_id}", "limit": "1"}
        )
        if project and project[0]["owner_id"] == user_id:
            return False
        rows = await self.client.delete(
            "project_contributors",
            {"project_id": f"eq.{project_id}", "user_id": f"eq.{user_id}", "select": "user_id"},
        )
        return bool(rows)


class EventService:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    async def list_events(self, limit: int, offset: int) -> list[dict[str, Any]]:
        now = datetime.now(UTC).isoformat()
        return await self.client.select(
            "event_directory", {**_page(limit, offset, "starts_at.asc"), "ends_at": f"gte.{now}"}
        )

    async def get(self, event_id: UUID) -> dict[str, Any] | None:
        rows = await self.client.select(
            "event_directory", {"select": "*", "id": f"eq.{event_id}", "limit": "1"}
        )
        return rows[0] if rows else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        return await self.client.insert("events", {**data, "organizer_id": user_id})

    async def rsvp(self, event_id: UUID, user_id: str) -> dict[str, Any] | None:
        return await self.client.upsert(
            "event_rsvps",
            {"event_id": str(event_id), "user_id": user_id, "status": "attending"},
            on_conflict="event_id,user_id",
        )

    async def cancel_rsvp(self, event_id: UUID, user_id: str) -> bool:
        rows = await self.client.delete(
            "event_rsvps",
            {"event_id": f"eq.{event_id}", "user_id": f"eq.{user_id}", "select": "event_id"},
        )
        return bool(rows)
