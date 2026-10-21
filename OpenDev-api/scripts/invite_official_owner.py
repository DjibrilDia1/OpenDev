"""One-off operator tool: invite the human-approved owner through Supabase Auth.

Requires an authenticated Supabase CLI operator. The privileged key exists only
in this process; it is never written to application configuration or output.
This tool is not part of the request-serving API and grants no global role.
"""

import argparse
import json
import subprocess
import sys
from urllib.parse import urlparse

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", default="supabase")
    parser.add_argument("--project-ref", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--redirect-url", required=True)
    args = parser.parse_args()
    if not args.project_ref.isalnum() or len(args.project_ref) != 20:
        parser.error("Expected a 20-character project reference")
    if urlparse(args.redirect_url).scheme not in {"http", "https"}:
        parser.error("Expected an HTTP(S) application redirect")

    command = [
        args.cli,
        "projects",
        "api-keys",
        "--project-ref",
        args.project_ref,
        "--reveal",
        "-o",
        "json",
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=45, check=False)
    if result.returncode:
        print("Operator authentication unavailable; no invitation requested.", file=sys.stderr)
        return 1
    records = json.loads(result.stdout)
    key = next(
        (
            record.get("api_key", "")
            for record in records
            if record.get("name") == "service_role" and record.get("api_key", "").startswith("eyJ")
        ),
        None,
    )
    if not key:
        key = next(
            (
                record.get("api_key", "")
                for record in records
                if record.get("api_key", "").startswith("sb_secret_")
            ),
            None,
        )
    if not key:
        print("No usable server key available; no invitation requested.", file=sys.stderr)
        return 1

    with httpx.Client(timeout=30) as client:
        response = client.post(
            f"https://{args.project_ref}.supabase.co/auth/v1/invite",
            headers={"apikey": key, "Authorization": "Bearer " + key},
            params={"redirect_to": args.redirect_url},
            json={
                "email": args.email,
                "data": {
                    "username": "opendev",
                    "full_name": "OpenDev",
                    "first_name": "OpenDev",
                    "last_name": "Équipe",
                    "headline": "Administration des communautés OpenDev",
                    "bio": (
                        "Compte officiel OpenDev pour la gestion des communautés de la plateforme."
                    ),
                },
            },
        )
    if not response.is_success:
        code = response.json().get("error_code", response.json().get("code", "request_failed"))
        safe = (
            code if isinstance(code, str) and code.replace("_", "").isalnum() else "request_failed"
        )
        print(json.dumps({"invited": False, "status": response.status_code, "code": safe}))
        return 1
    user = response.json()
    print(json.dumps({"invited": True, "id": user["id"], "username": "opendev"}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (httpx.HTTPError, ValueError, subprocess.SubprocessError):
        print(
            "The operator invitation did not complete; check status before retrying.",
            file=sys.stderr,
        )
        raise SystemExit(1) from None
