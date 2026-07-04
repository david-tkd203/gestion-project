import hmac
import hashlib
import json
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import GitHubConnection, GitHubBranch, GitHubCommit, GitHubAlert
from .serializers import (
    GitHubConnectionSerializer,
    GitHubBranchSerializer,
    GitHubCommitSerializer,
    GitHubAlertSerializer,
)

logger = logging.getLogger(__name__)


class GitHubConnectionViewSet(viewsets.ModelViewSet):
    queryset = GitHubConnection.objects.select_related("proyecto").all()
    serializer_class = GitHubConnectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["proyecto"]

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        connection = self.get_object()
        # tasks module will be imported lazily to avoid circular import
        from .tasks import sync_all
        sync_all.delay(str(connection.id))
        return Response(
            {"status": "sync triggered"},
            status=status.HTTP_202_ACCEPTED,
        )


class GitHubBranchViewSet(viewsets.ModelViewSet):
    queryset = GitHubBranch.objects.select_related("area", "connection").all()
    serializer_class = GitHubBranchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["connection", "area", "is_active"]
    http_method_names = ["get", "patch", "head", "options"]


class GitHubCommitListView(viewsets.ReadOnlyModelViewSet):
    queryset = GitHubCommit.objects.select_related("branch", "area").all()
    serializer_class = GitHubCommitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["area", "is_fix", "branch__connection"]
    ordering_fields = ["committed_at", "created_at"]
    ordering = ["-committed_at"]


class GitHubAlertListView(viewsets.ReadOnlyModelViewSet):
    queryset = GitHubAlert.objects.all()
    serializer_class = GitHubAlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["connection", "alert_type", "severity", "state"]
    ordering_fields = ["created_at", "severity"]
    ordering = ["-created_at"]


@api_view(["POST"])
@permission_classes([AllowAny])
def github_webhook(request):
    """Receive GitHub webhook events. No DRF auth — verified by HMAC-SHA256."""
    signature = request.headers.get("X-Hub-Signature-256", "")
    body = request.body

    # Parse payload to find the repo
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response({"error": "invalid json"}, status=400)

    repo_full = payload.get("repository", {}).get("full_name", "")
    if not repo_full:
        return Response({"error": "no repo in payload"}, status=400)

    parts = repo_full.split("/", 1)
    if len(parts) != 2:
        return Response({"error": "invalid repo"}, status=400)

    conn = GitHubConnection.objects.filter(
        repo_owner=parts[0], repo_name=parts[1]
    ).first()

    if not conn or not conn.webhook_secret:
        logger.warning("webhook: no connection for %s", repo_full)
        return Response({"error": "unknown repo"}, status=404)

    # Verify HMAC
    expected = "sha256=" + hmac.new(
        conn.webhook_secret.encode(), body, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        logger.warning("webhook: invalid signature for %s", repo_full)
        return Response({"error": "invalid signature"}, status=401)

    event = request.headers.get("X-GitHub-Event", "")
    logger.info("webhook: received %s for %s", event, repo_full)

    if event == "push":
        from .webhooks import process_push_event
        process_push_event.delay(str(conn.id), payload)

    elif event in ("code_scanning_alert", "dependabot_alert", "secret_scanning_alert"):
        alert_type = event.replace("_alert", "").replace("dependabot", "dependabot")
        from .webhooks import process_alert_event
        process_alert_event.delay(str(conn.id), payload, alert_type)

    return Response({"status": "accepted"}, status=202)

