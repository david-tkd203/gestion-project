"""
Management command to import VINCULOsync Excel into the database.

Usage:
  python manage.py import_vinculo path/to/Tareas_VINCULOsync_FINAL.xlsx
  python manage.py import_vinculo path/to/file.xlsx --project "Mi Proyecto"
"""
from django.core.management.base import BaseCommand, CommandError
from apps.core.services import import_excel


class Command(BaseCommand):
    help = "Import VINCULOsync Excel into the Hybrid PM database"

    def add_arguments(self, parser):
        parser.add_argument("file_path", type=str, help="Path to the Excel file")
        parser.add_argument(
            "--project",
            type=str,
            default="VINCULOsync",
            help="Project name (default: VINCULOsync)",
        )

    def handle(self, *args, **options):
        file_path = options["file_path"]
        project_name = options["project"]

        self.stdout.write(f"📂 Importing {file_path} into project '{project_name}'...")

        try:
            result = import_excel(file_path, proyecto_nombre=project_name)
        except FileNotFoundError:
            raise CommandError(f"File not found: {file_path}")
        except Exception as e:
            raise CommandError(f"Import failed: {e}")

        self.stdout.write(self.style.SUCCESS(str(result)))
        if result.usuarios_no_encontrados:
            self.stdout.write(
                self.style.WARNING(
                    f"⚠️  {len(result.usuarios_no_encontrados)} users not matched: "
                    f"{', '.join(result.usuarios_no_encontrados[:10])}"
                )
            )
