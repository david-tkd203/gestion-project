import requests
from django.conf import settings


class GitHubApiClient:
    BASE = "https://api.github.com"

    def __init__(self, token: str):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    def get(self, path: str, params: dict | None = None, etag: str | None = None):
        headers = {}
        if etag:
            headers["If-None-Match"] = etag
        resp = self.session.get(
            f"{self.BASE}{path}",
            params=params,
            headers=headers,
            timeout=30,
        )
        if resp.status_code == 304:
            return None, etag
        resp.raise_for_status()
        return resp.json(), resp.headers.get("ETag")

    def validate_token(self) -> bool:
        try:
            self.get("/user")
            return True
        except requests.HTTPError:
            return False
        except requests.RequestException:
            return False

    def fetch_branches(self, repo: str) -> list[dict]:
        data, _ = self.get(f"/repos/{repo}/branches", params={"per_page": 100})
        return data or []

    def fetch_commits(
        self,
        repo: str,
        branch: str,
        per_page: int = 100,
        etag: str | None = None,
    ):
        return self.get(
            f"/repos/{repo}/commits",
            params={"sha": branch, "per_page": per_page},
            etag=etag,
        )

    def fetch_alerts(self, repo: str, alert_type: str) -> list[dict]:
        try:
            data, _ = self.get(
                f"/repos/{repo}/{alert_type}/alerts",
                params={"state": "open", "per_page": 100},
            )
            return data or []
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code in (403, 404):
                return []
            raise
