import uuid
from django.db import models
from django.core.signing import TimestampSigner


class GitHubConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.OneToOneField(
        "core.Proyecto",
        on_delete=models.CASCADE,
        related_name="github_connection",
    )
    repo_owner = models.CharField(max_length=100)
    repo_name = models.CharField(max_length=100)
    access_token_encrypted = models.TextField()
    webhook_secret = models.CharField(max_length=64, blank=True, default="")
    webhook_id = models.IntegerField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "GitHub Connection"
        verbose_name_plural = "GitHub Connections"

    def __str__(self):
        return self.repo_full_name

    @property
    def access_token(self):
        signer = TimestampSigner()
        return signer.unsign(self.access_token_encrypted)

    @property
    def repo_full_name(self):
        return f"{self.repo_owner}/{self.repo_name}"


class GitHubBranch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(
        GitHubConnection,
        on_delete=models.CASCADE,
        related_name="branches",
    )
    area = models.ForeignKey(
        "core.Area",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="github_branches",
    )
    branch_name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    last_commit_sha = models.CharField(max_length=40, blank=True, default="")
    last_commit_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "GitHub Branch"
        verbose_name_plural = "GitHub Branches"
        unique_together = [("connection", "branch_name")]
        ordering = ["branch_name"]

    def __str__(self):
        return self.branch_name


class GitHubCommit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        GitHubBranch,
        on_delete=models.CASCADE,
        related_name="commits",
    )
    area = models.ForeignKey(
        "core.Area",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    sha = models.CharField(max_length=40, unique=True)
    message = models.TextField()
    author_login = models.CharField(max_length=100)
    author_avatar = models.URLField(blank=True, default="")
    committed_at = models.DateTimeField()
    is_fix = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "GitHub Commit"
        verbose_name_plural = "GitHub Commits"
        ordering = ["-committed_at"]

    def __str__(self):
        return self.sha[:7]


class GitHubAlert(models.Model):
    class AlertType(models.TextChoices):
        DEPENDABOT = "dependabot", "Dependabot"
        CODE_SCANNING = "code_scanning", "Code Scanning"
        SECRET_SCANNING = "secret_scanning", "Secret Scanning"

    class Severity(models.TextChoices):
        CRITICAL = "critical", "Critical"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        WARNING = "warning", "Warning"
        NOTE = "note", "Note"

    class State(models.TextChoices):
        OPEN = "open", "Open"
        FIXED = "fixed", "Fixed"
        DISMISSED = "dismissed", "Dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(
        GitHubConnection,
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    alert_type = models.CharField(max_length=20, choices=AlertType.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    state = models.CharField(max_length=10, choices=State.choices, default=State.OPEN)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, default="")
    package_name = models.CharField(max_length=255, blank=True, default="")
    html_url = models.URLField()
    github_id = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "GitHub Alert"
        verbose_name_plural = "GitHub Alerts"
        unique_together = [("connection", "alert_type", "github_id")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.alert_type}] {self.title[:80]}"
