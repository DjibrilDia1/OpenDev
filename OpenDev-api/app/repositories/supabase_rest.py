from typing import Any

import httpx


class SupabaseRestError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class SupabaseRestClient:
    """Request-scoped PostgREST adapter that preserves the caller's RLS identity."""

    def __init__(
        self,
        *,
        http: httpx.AsyncClient,
        base_url: str,
        publishable_key: str,
        access_token: str | None,
    ) -> None:
        self.http = http
        self.rest_url = f"{base_url}/rest/v1"
        self.publishable_key = publishable_key
        self.access_token = access_token

    def _headers(self, *, returning: bool = False) -> dict[str, str]:
        headers = {"apikey": self.publishable_key, "Accept": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if returning:
            headers["Prefer"] = "return=representation"
        return headers

    async def request(
        self,
        method: str,
        resource: str,
        *,
        params: dict[str, str] | None = None,
        body: dict[str, Any] | None = None,
    ) -> Any:
        try:
            response = await self.http.request(
                method,
                f"{self.rest_url}/{resource}",
                params=params,
                json=body,
                headers=self._headers(returning=body is not None or method == "DELETE"),
            )
        except httpx.RequestError as exc:
            raise SupabaseRestError(502, "Supabase Data API is unavailable") from exc
        if response.is_error:
            try:
                payload = response.json()
                detail = (
                    payload.get("message") or payload.get("details") or "Supabase request failed"
                )
            except ValueError:
                detail = "Supabase request failed"
            raise SupabaseRestError(response.status_code, str(detail))
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    async def select(self, resource: str, params: dict[str, str]) -> list[dict[str, Any]]:
        data = await self.request("GET", resource, params=params)
        return data if isinstance(data, list) else []

    async def insert(self, resource: str, body: dict[str, Any]) -> dict[str, Any] | None:
        data = await self.request("POST", resource, body=body)
        return data[0] if isinstance(data, list) and data else None

    async def upsert(
        self, resource: str, body: dict[str, Any], *, on_conflict: str
    ) -> dict[str, Any] | None:
        try:
            response = await self.http.post(
                f"{self.rest_url}/{resource}",
                params={"on_conflict": on_conflict},
                json=body,
                headers={
                    **self._headers(),
                    "Prefer": "resolution=merge-duplicates,return=representation",
                },
            )
        except httpx.RequestError as exc:
            raise SupabaseRestError(502, "Supabase Data API is unavailable") from exc
        if response.is_error:
            try:
                detail = response.json().get("message", "Supabase request failed")
            except ValueError:
                detail = "Supabase request failed"
            raise SupabaseRestError(response.status_code, str(detail))
        data = response.json() if response.content else []
        return data[0] if isinstance(data, list) and data else None

    async def update(
        self, resource: str, filters: dict[str, str], body: dict[str, Any]
    ) -> list[dict[str, Any]]:
        data = await self.request("PATCH", resource, params=filters, body=body)
        return data if isinstance(data, list) else []

    async def delete(self, resource: str, filters: dict[str, str]) -> list[dict[str, Any]]:
        data = await self.request("DELETE", resource, params=filters)
        return data if isinstance(data, list) else []
