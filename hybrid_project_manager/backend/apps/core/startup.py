"""
Startup initialization — runs once when the Django server starts.
Ensures initial users exist with predictable dev passwords and configured roles.
"""
import logging
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.utils import OperationalError, ProgrammingError
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()

CACHE_KEY = "vinculo_startup_init_done"

ROLE_LABELS = {
    "director": "Director de Proyecto",
    "arquitecto": "Arquitecto y Desarrollo Tecnico",
    "lector": "Solo Lectura",
}


def initialize_platform():
    """
    Initializes platform users and roles.
    Ensures 'admin' (director) and 'david' (arquitecto) exist and are ready for use.
    """
    if cache.get(CACHE_KEY):
        logger.info("Startup init already completed (cache flag)")
        return

    try:
        User.objects.count()
    except (OperationalError, ProgrammingError):
        logger.warning("DB not ready yet — skipping startup init")
        return

    logger.info("=== Running startup initialization ===")

    from .models import UserProfile

    team = [
        {
            "username": "admin",
            "email": "admin@vinculopm.local",
            "name": "Administrador",
            "password": "admin123",
            "role": "director",
            "is_superuser": True,
            "is_staff": True,
        },
        {
            "username": "david",
            "email": "david.203.52@gmail.com",
            "name": "David",
            "password": "david123",
            "role": "arquitecto",
            "is_superuser": False,
            "is_staff": True,
        },
    ]

    for member in team:
        user, created = User.objects.get_or_create(
            username=member["username"],
            defaults={
                "email": member["email"],
                "first_name": member["name"],
                "is_staff": member["is_staff"],
                "is_superuser": member["is_superuser"],
            },
        )
        if created or settings.DEBUG:
            user.set_password(member["password"])
            user.is_staff = member["is_staff"]
            user.is_superuser = member["is_superuser"]
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = member["role"]
        profile.must_change_password = False
        profile.save(update_fields=["role", "must_change_password"])

        logger.info("Ready user: %s (role: %s)", user.username, profile.role)

    cache.set(CACHE_KEY, True, timeout=None)
    logger.info("=== Startup initialization complete ===")
