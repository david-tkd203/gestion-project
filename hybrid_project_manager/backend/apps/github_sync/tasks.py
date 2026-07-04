import logging
from celery import shared_task
from django.utils import timezone

from .models import GitHubConnection, GitHubBranch, GitHubCommit, GitHubAlert
from .services import GitHubApiClient

logger = logging.getLogger(__name__)

FIX_KEYWORDS = [
    "fix", "bug", "hotfix", "patch",
    "corrige", "corrección", "arregla", "soluciona",
]


@shared_task
def sync_all_connections():
    """Celery Beat task: sync all active connections."""
    for conn in GitHubConnection.objects.all():
        sync_all.delay(str(conn.id))
    return {"synced": GitHubConnection.objects.count()}


@shared_task
def sync_all(connection_id: str):
    """Full sync: branches → commits → alerts."""
    try:
        conn = GitHubConnection.objects.get(id=connection_id)
    except GitHubConnection.DoesNotExist:
        logger.warning("sync_all: connection %s not found", connection_id)
        return {"error": "connection not found"}

    client = GitHubApiClient(conn.access_token)
    repo = conn.repo_full_name

    sync_branches(conn, client, repo)
    sync_commits(conn, client, repo)
    sync_alerts(conn, client, repo)

    conn.last_synced_at = timezone.now()
    conn.save(update_fields=["last_synced_at"])

    return {"status": "ok", "repo": repo}


def sync_branches(conn: GitHubConnection, client: GitHubApiClient, repo: str):
    gh_branches = client.fetch_branches(repo)
    existing_names = set(
        conn.branches.values_list("branch_name", flat=True)
    )
    gh_names = {b["name"] for b in gh_branches}

    # Mark deleted branches inactive
    conn.branches.filter(
        branch_name__in=existing_names - gh_names
    ).update(is_active=False)

    for b in gh_branches:
        conn.branches.update_or_create(
            branch_name=b["name"],
            defaults={
                "is_default": False,  # will check below
                "last_commit_sha": b["commit"]["sha"],
                "is_active": True,
            },
        )

    # Set default branch
    repo_info, _ = client.get(f"/repos/{repo}")
    if repo_info:
        default_branch = repo_info.get("default_branch", "")
        conn.branches.filter(branch_name=default_branch).update(is_default=True)


def sync_commits(conn: GitHubConnection, client: GitHubApiClient, repo: str):
    for branch in conn.branches.filter(is_active=True):
        data, etag = client.fetch_commits(repo, branch.branch_name)
        if data is None:
            continue  # 304 not modified

        for c in data:
            msg = c.get("commit", {}).get("message", "")
            is_fix = any(w in msg.lower() for w in FIX_KEYWORDS)
            author = c.get("author") or {}
            commit_info = c.get("commit", {}).get("author", {})

            GitHubCommit.objects.get_or_create(
                sha=c["sha"],
                defaults={
                    "branch": branch,
                    "area": branch.area,
                    "message": msg,
                    "author_login": author.get("login", "unknown"),
                    "author_avatar": author.get("avatar_url", ""),
                    "committed_at": commit_info.get("date") or timezone.now(),
                    "is_fix": is_fix,
                },
            )

        # Update last commit info on branch
        if data and len(data) > 0:
            branch.last_commit_date = data[0].get("commit", {}).get(
                "author", {}
            ).get("date")
            branch.save(update_fields=["last_commit_date"])


def sync_alerts(conn: GitHubConnection, client: GitHubApiClient, repo: str):
    for alert_type in ["dependabot", "code-scanning", "secret-scanning"]:
        alerts = client.fetch_alerts(repo, alert_type)
        for a in alerts:
            advisory = a.get("security_advisory", {})
            vuln = a.get("security_vulnerability", {})
            rule = a.get("rule", {})

            GitHubAlert.objects.update_or_create(
                connection=conn,
                alert_type=alert_type,
                github_id=a.get("number", a.get("id", 0)),
                defaults={
                    "severity": (
                        advisory.get("severity")
                        or rule.get("security_severity_level")
                        or "medium"
                    ),
                    "state": a.get("state", "open"),
                    "title": (
                        advisory.get("summary")
                        or rule.get("description")
                        or ""
                    ),
                    "description": advisory.get("description", ""),
                    "package_name": vuln.get("package", {}).get("name", ""),
                    "html_url": a.get("html_url", ""),
                },
            )
