import logging
from celery import shared_task
from django.utils import timezone

from .models import GitHubConnection, GitHubCommit, GitHubAlert

logger = logging.getLogger(__name__)

FIX_KEYWORDS = [
    "fix", "bug", "hotfix", "patch",
    "corrige", "corrección", "arregla", "soluciona",
]


@shared_task
def process_push_event(connection_id: str, payload: dict):
    """Process a GitHub push webhook payload."""
    try:
        conn = GitHubConnection.objects.get(id=connection_id)
    except GitHubConnection.DoesNotExist:
        logger.warning("process_push_event: connection %s not found", connection_id)
        return

    ref = payload.get("ref", "")  # e.g. refs/heads/main
    branch_name = ref.replace("refs/heads/", "")
    branch = conn.branches.filter(branch_name=branch_name, is_active=True).first()

    if not branch:
        logger.info("process_push_event: branch %s not tracked", branch_name)
        return

    commits = payload.get("commits", [])
    for c in commits:
        msg = c.get("message", "")
        is_fix = any(w in msg.lower() for w in FIX_KEYWORDS)

        GitHubCommit.objects.get_or_create(
            sha=c["id"],
            defaults={
                "branch": branch,
                "area": branch.area,
                "message": msg,
                "author_login": c.get("author", {}).get("username", "unknown"),
                "author_avatar": "",
                "committed_at": c.get("timestamp") or timezone.now(),
                "is_fix": is_fix,
            },
        )

    # Update branch last commit
    if commits:
        last = commits[0]
        branch.last_commit_sha = last["id"]
        branch.last_commit_date = last.get("timestamp") or timezone.now()
        branch.save(update_fields=["last_commit_sha", "last_commit_date"])


@shared_task
def process_alert_event(connection_id: str, payload: dict, alert_type: str):
    """Process a code_scanning_alert or dependabot_alert webhook payload."""
    try:
        conn = GitHubConnection.objects.get(id=connection_id)
    except GitHubConnection.DoesNotExist:
        logger.warning("process_alert_event: connection %s not found", connection_id)
        return

    alert_data = payload.get("alert", payload)
    action = payload.get("action", "created")

    if action == "fixed" or action == "dismissed":
        GitHubAlert.objects.filter(
            connection=conn,
            alert_type=alert_type,
            github_id=alert_data.get("number", 0),
        ).update(state=action)
        return

    advisory = alert_data.get("security_advisory", {})
    vuln = alert_data.get("security_vulnerability", {})
    rule = alert_data.get("rule", {})

    GitHubAlert.objects.update_or_create(
        connection=conn,
        alert_type=alert_type,
        github_id=alert_data.get("number", alert_data.get("id", 0)),
        defaults={
            "severity": (
                advisory.get("severity")
                or rule.get("security_severity_level")
                or alert_data.get("severity")
                or "medium"
            ),
            "state": alert_data.get("state", "open"),
            "title": (
                advisory.get("summary")
                or rule.get("description")
                or alert_data.get("description", "")
            ),
            "description": advisory.get("description", ""),
            "package_name": vuln.get("package", {}).get("name", ""),
            "html_url": alert_data.get("html_url", ""),
        },
    )
