from django.contrib import admin
from .models import GitHubConnection, GitHubBranch, GitHubCommit, GitHubAlert


@admin.register(GitHubConnection)
class GitHubConnectionAdmin(admin.ModelAdmin):
    list_display = ["proyecto", "repo_owner", "repo_name", "last_synced_at"]
    readonly_fields = ["last_synced_at"]


@admin.register(GitHubBranch)
class GitHubBranchAdmin(admin.ModelAdmin):
    list_display = ["connection", "branch_name", "area", "is_active", "last_commit_date"]
    list_filter = ["is_active", "area"]


@admin.register(GitHubCommit)
class GitHubCommitAdmin(admin.ModelAdmin):
    list_display = ["sha_short", "author_login", "committed_at", "is_fix", "area"]
    list_filter = ["is_fix", "area"]

    @admin.display(description="SHA")
    def sha_short(self, obj):
        return obj.sha[:7]


@admin.register(GitHubAlert)
class GitHubAlertAdmin(admin.ModelAdmin):
    list_display = ["alert_type", "severity", "state", "title", "created_at"]
    list_filter = ["alert_type", "severity", "state"]
