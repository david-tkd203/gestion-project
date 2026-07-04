import threading
from django.apps import AppConfig
from django.db import connections


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core"

    def ready(self) -> None:
        import apps.core.signals  # noqa: F401

        # Run startup init once on a background thread (don't block server start)
        def _startup():
            # Wait for the default DB connection to be ready
            try:
                conn = connections["default"]
                conn.ensure_connection()
            except Exception:
                return
            from .startup import initialize_platform
            initialize_platform()

        thread = threading.Thread(target=_startup, daemon=True)
        thread.start()
