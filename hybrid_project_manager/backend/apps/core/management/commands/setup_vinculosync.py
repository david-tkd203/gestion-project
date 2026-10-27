import os
from django.core.management.base import BaseCommand, CommandError
from django.core.signing import TimestampSigner
from apps.core.models import Proyecto
from apps.core.services import import_excel
from apps.github_sync.models import GitHubConnection, GitHubBranch


class Command(BaseCommand):
    help = "Setup VINCULOsync project from Excel data and configure its GitHub repository connection"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default="",
            help="Path to Tareas_VINCULOsync_FINAL.xlsx (default looks in backend/data/)",
        )
        parser.add_argument(
            "--project",
            type=str,
            default="VINCULOsync",
            help="Project name (default: VINCULOsync)",
        )
        parser.add_argument(
            "--repo",
            type=str,
            default="david-tkd203/vinculosync",
            help="GitHub repo (default: david-tkd203/vinculosync)",
        )

    def handle(self, *args, **options):
        project_name = options["project"]
        repo_full = options["repo"]
        file_path = options["file"]

        if not file_path:
            # Default search locations
            candidates = [
                os.path.join("data", "Tareas_VINCULOsync_FINAL.xlsx"),
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "Tareas_VINCULOsync_FINAL.xlsx"),
                os.path.join("..", "Tareas_VINCULOsync_FINAL.xlsx"),
            ]
            for cand in candidates:
                cand_path = os.path.abspath(cand)
                if os.path.exists(cand_path):
                    file_path = cand_path
                    break

        if not file_path or not os.path.exists(file_path):
            raise CommandError(f"Excel file not found. Please provide --file path.")

        self.stdout.write(self.style.NOTICE(f"Importing Excel data from {file_path}..."))
        result = import_excel(file_path, proyecto_nombre=project_name)
        self.stdout.write(self.style.SUCCESS(f"  [OK] Excel imported: {result}"))

        proyecto = Proyecto.objects.get(nombre=project_name)

        # Parse repo
        parts = repo_full.split("/")
        if len(parts) != 2:
            raise CommandError("Repo must be formatted as 'owner/repo'")

        repo_owner, repo_name = parts[0], parts[1]

        signer = TimestampSigner()
        conn, created = GitHubConnection.objects.get_or_create(
            proyecto=proyecto,
            defaults={
                "repo_owner": repo_owner,
                "repo_name": repo_name,
                "access_token_encrypted": signer.sign(""),
            },
        )
        if not created and (conn.repo_owner != repo_owner or conn.repo_name != repo_name):
            conn.repo_owner = repo_owner
            conn.repo_name = repo_name
            conn.save(update_fields=["repo_owner", "repo_name"])

        # Create default main branch entry
        GitHubBranch.objects.get_or_create(
            connection=conn,
            branch_name="main",
            defaults={"is_default": True, "is_active": True},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"  [OK] Project '{proyecto.nombre}' linked to GitHub repo: {repo_owner}/{repo_name}"
            )
        )
