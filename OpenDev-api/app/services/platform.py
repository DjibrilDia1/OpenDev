import re
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import HTTPException

from app.repositories.supabase_rest import SupabaseRestClient
from app.services.contributions import ContributionService


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
        kind: Literal["official", "member"] | None = None,
    ) -> list[dict[str, Any]]:
        params = _page(
            limit, offset, "member_count.desc,name.asc" if sort == "popular" else "created_at.desc"
        )
        params["select"] = (
            "id,slug,name,description,tags,created_by,created_at,member_count,is_official,category,"
            "cover_url,rules,resources,post_count,weekly_discussions_count"
        )
        params["archived_at"] = "is.null"
        if kind is not None:
            params["is_official"] = "eq.true" if kind == "official" else "eq.false"
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
            "id,username,full_name,headline,bio,avatar_url,location,post_count,community_count,"
            "tags,cover_url,website_url,github_url,account_type,company_name"
        )
        search = _safe_search(query)
        if search:
            params["or"] = (
                f"(username.ilike.*{search}*,full_name.ilike.*{search}*,headline.ilike.*{search}*)"
            )
        rows = await self.client.select("people_directory", params)
        return await ContributionService(self.client).enrich(rows)

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
            "community_directory",
            {"select": "*", "slug": f"eq.{slug}", "archived_at": "is.null", "limit": "1"},
        )
        return rows[0] if rows else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        return await self.client.insert("communities", {**data, "created_by": user_id})

    async def members(
        self,
        community_id: UUID,
        *,
        limit: int,
        offset: int,
        query: str | None = None,
        role: Literal["staff", "owner", "moderator", "member"] | None = None,
    ) -> list[dict[str, Any]] | None:
        community = await self.client.select(
            "communities", {"select": "id", "id": f"eq.{community_id}", "limit": "1"}
        )
        if not community:
            return None
        search = _safe_search(query)
        relation = "profiles!community_members_user_id_fkey" + ("!inner" if search else "")
        params = {
            **_page(limit, offset, "joined_at.asc,user_id.asc"),
            "select": (
                f"user_id,role,joined_at,permissions,profile:{relation}("
                "id,username,full_name,headline,bio,avatar_url,tags,account_type,company_name)"
            ),
            "community_id": f"eq.{community_id}",
        }
        if search:
            params["profile.or"] = f"(username.ilike.*{search}*,full_name.ilike.*{search}*)"
        if role is not None:
            params["role"] = "in.(owner,moderator)" if role == "staff" else f"eq.{role}"
        rows = await self.client.select("community_members", params)
        scores = await ContributionService(self.client).scores(row["user_id"] for row in rows)
        return [
            {
                **row,
                "profile": {
                    **row["profile"],
                    "contribution_score": scores.get(str(row["user_id"]), {}).get("score", 0),
                }
                if row.get("profile")
                else None,
            }
            for row in rows
        ]

    async def join(self, community_id: UUID, user_id: str) -> dict[str, Any] | None:
        current = await self.client.select(
            "community_members",
            {
                "select": "community_id,user_id,role,joined_at,permissions,notifications_enabled",
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
        removed = await self.client.request(
            "POST",
            "rpc/community_remove_member",
            body={"p_community_id": str(community_id), "p_user_id": user_id},
        )
        return bool(removed)


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
        channel_id: UUID | None = None,
        post_type: Literal["discussion", "question", "showcase", "resource"] | None = None,
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        if channel_id:
            if community_id is None:
                raise HTTPException(status_code=422, detail="A channel filter requires a community")
            channels = await self.client.select(
                "community_channels",
                {
                    "select": "id",
                    "id": f"eq.{channel_id}",
                    "community_id": f"eq.{community_id}",
                    "limit": "1",
                },
            )
            if not channels:
                raise HTTPException(status_code=404, detail="Community channel not found")
        params = _page(
            limit,
            offset,
            "like_count.desc,created_at.desc,id.desc"
            if sort == "popular"
            else "created_at.desc,id.desc",
        )
        params["select"] = "*"
        params["community_archived_at"] = "is.null"
        if community_id:
            params["community_id"] = f"eq.{community_id}"
        if channel_id:
            params["channel_id"] = f"eq.{channel_id}"
        if post_type:
            params["post_type"] = f"eq.{post_type}"
        search = _safe_search(query)
        if search:
            params["or"] = f"(title.ilike.*{search}*,body.ilike.*{search}*)"
        rows = await self.client.select("post_directory", params)
        return await ContributionService(self.client).enrich_posts(rows)

    async def get(self, post_id: UUID) -> dict[str, Any] | None:
        rows = await self.client.select(
            "post_directory", {"select": "*", "id": f"eq.{post_id}", "limit": "1"}
        )
        enriched = await ContributionService(self.client).enrich_posts(rows)
        return enriched[0] if enriched else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        post = await self.client.insert("posts", {**data, "author_id": user_id})
        return await self.get(UUID(post["id"])) if post else None

    async def update(
        self, post_id: UUID, data: dict[str, Any], user_id: str
    ) -> dict[str, Any] | None:
        rows = await self.client.update(
            "posts", {"id": f"eq.{post_id}", "author_id": f"eq.{user_id}", "select": "*"}, data
        )
        return await self.get(post_id) if rows else None

    async def delete(self, post_id: UUID, user_id: str) -> bool:
        rows = await self.client.delete("posts", {"id": f"eq.{post_id}", "select": "id"})
        return bool(rows)

    async def delete_comment(self, post_id: UUID, comment_id: UUID) -> bool:
        rows = await self.client.delete(
            "comments",
            {"id": f"eq.{comment_id}", "post_id": f"eq.{post_id}", "select": "id"},
        )
        return bool(rows)

    async def comments(self, post_id: UUID, limit: int, offset: int) -> list[dict[str, Any]]:
        rows = await self.client.select(
            "comment_contribution_directory",
            {
                **_page(limit, offset, "created_at.asc,id.asc"),
                "post_id": f"eq.{post_id}",
            },
        )
        return await self._enrich_comments(rows)

    async def _enrich_comments(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        identities = sorted({str(UUID(str(row["author_id"]))) for row in rows})
        if not identities:
            return []
        # Explicit batch lookup avoids relying on FK lineage through the summary view.
        profiles = await self.client.select(
            "profiles",
            {
                "select": "id,full_name,username,account_type,company_name,avatar_url",
                "id": f"in.({','.join(identities)})",
            },
        )
        authors = {str(profile["id"]): profile for profile in profiles}
        enriched = await ContributionService(self.client).enrich_posts(rows)
        return [{**row, "author": authors.get(str(row["author_id"]))} for row in enriched]

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
        comment = await self.client.insert(
            "comments", {**data, "post_id": str(post_id), "author_id": user_id}
        )
        if comment is None:
            return None
        rows = await self.client.select(
            "comment_contribution_directory",
            {"select": "*", "id": f"eq.{comment['id']}", "post_id": f"eq.{post_id}", "limit": "1"},
        )
        enriched = await self._enrich_comments(rows)
        return enriched[0] if enriched else None

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

    async def list_events(
        self,
        limit: int,
        offset: int,
        *,
        community_id: UUID | None = None,
        starts_after: datetime | None = None,
        starts_before: datetime | None = None,
        include_past: bool = False,
    ) -> list[dict[str, Any]]:
        now = datetime.now(UTC).isoformat()
        params = _page(limit, offset, "starts_at.asc,id.asc")
        params["community_archived_at"] = "is.null"
        if not include_past and starts_after is None and starts_before is None:
            params["ends_at"] = f"gte.{now}"
        if community_id is not None:
            params["community_id"] = f"eq.{community_id}"
        bounds = []
        if starts_after is not None:
            bounds.append(f"starts_at.gte.{starts_after.isoformat()}")
        if starts_before is not None:
            bounds.append(f"starts_at.lt.{starts_before.isoformat()}")
        if bounds:
            params["and"] = f"({','.join(bounds)})"
        return await self.client.select("event_directory", params)

    async def get(self, event_id: UUID) -> dict[str, Any] | None:
        rows = await self.client.select(
            "event_directory", {"select": "*", "id": f"eq.{event_id}", "limit": "1"}
        )
        return rows[0] if rows else None

    async def create(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        return await self.client.request("POST", "rpc/event_create", body={"p_data": data})

    async def update(self, event_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        current = await self.get(event_id)
        if current is None:
            raise HTTPException(status_code=404, detail="Event not found")
        # Forms send the complete event, but the mutation cannot move its community.
        update = dict(data)
        if "community_id" in update and update.pop("community_id") != current.get("community_id"):
            raise HTTPException(status_code=422, detail="Event community cannot be changed")
        return await self.client.request(
            "POST", "rpc/event_update", body={"p_event_id": str(event_id), "p_data": update}
        )

    async def delete(self, event_id: UUID) -> None:
        await self.client.request("POST", "rpc/event_delete", body={"p_event_id": str(event_id)})

    async def rsvp(self, event_id: UUID, user_id: str) -> None:
        await self.client.request("POST", "rpc/event_register", body={"p_event_id": str(event_id)})

    async def cancel_rsvp(self, event_id: UUID, user_id: str) -> None:
        await self.client.request(
            "POST", "rpc/event_unregister", body={"p_event_id": str(event_id)}
        )
