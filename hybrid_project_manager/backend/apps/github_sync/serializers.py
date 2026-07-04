from rest_framework import serializers
from .models import GitHubConnection, GitHubBranch, GitHubCommit, GitHubAlert


class GitHubConnectionSerializer(serializers.ModelSerializer):
    access_token = serializers.CharField(write_only=True, required=True)
    proyecto_nombre = serializers.CharField(source="proyecto.nombre", read_only=True)

    class Meta:
        model = GitHubConnection
        fields = [
            "id", "proyecto", "proyecto_nombre", "repo_owner", "repo_name",
            "access_token", "webhook_id", "last_synced_at", "created_at",
        ]
        read_only_fields = ["webhook_id", "last_synced_at", "created_at"]

    def validate(self, attrs):
        from .services import GitHubApiClient
        client = GitHubApiClient(attrs["access_token"])
        if not client.validate_token():
            raise serializers.ValidationError({
                "access_token": "Token inválido o sin permisos suficientes"
            })
        return attrs

    def create(self, validated_data):
        from django.core.signing import TimestampSigner
        token = validated_data.pop("access_token")
        signer = TimestampSigner()
        validated_data["access_token_encrypted"] = signer.sign(token)
        return super().create(validated_data)


class GitHubBranchSerializer(serializers.ModelSerializer):
    area_codigo = serializers.CharField(source="area.codigo", read_only=True, default="")
    area_nombre = serializers.CharField(source="area.nombre", read_only=True, default="")
    area_color = serializers.CharField(source="area.color", read_only=True, default="")

    class Meta:
        model = GitHubBranch
        fields = [
            "id", "connection", "area", "area_codigo", "area_nombre", "area_color",
            "branch_name", "is_default", "last_commit_sha", "last_commit_date",
            "is_active",
        ]
        read_only_fields = ["connection", "last_commit_sha", "last_commit_date"]


class GitHubCommitSerializer(serializers.ModelSerializer):
    area_codigo = serializers.CharField(source="area.codigo", read_only=True, default="")
    area_color = serializers.CharField(source="area.color", read_only=True, default="")
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = GitHubCommit
        fields = [
            "id", "sha", "message", "author_login", "author_avatar",
            "committed_at", "is_fix", "area", "area_codigo", "area_color",
            "branch_name", "created_at",
        ]


class GitHubAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = GitHubAlert
        fields = "__all__"
