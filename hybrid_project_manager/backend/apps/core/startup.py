"""
Startup initialization — runs once when the Django server starts.
Sends initial access emails to the team and removes the admin superuser.
"""
import logging
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.utils import OperationalError, ProgrammingError
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()

CACHE_KEY = "vinculo_startup_init_done"


def initialize_platform():
    """
    One-time initialization after DB is ready:
    1. Creates/updates users for david.203.52@gmail.com and bduran@estudiante.uc.cl
    2. Assigns roles
    3. Sends welcome email with access info
    4. Removes the admin superuser
    """
    # Guard via cache (persists in Redis across restarts)
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
        {"email": "david.203.52@gmail.com", "username": "david", "name": "David", "role": "arquitecto"},
        {"email": "bduran@estudiante.uc.cl", "username": "benjamin", "name": "Benjamin", "role": "director"},
    ]

    for member in team:
        user, _ = User.objects.get_or_create(
            username=member["username"],
            defaults={
                "email": member["email"],
                "first_name": member["name"],
                "is_staff": True,
            },
        )
        if user.email != member["email"] or user.first_name != member["name"] or not user.is_staff:
            user.email = member["email"]
            user.first_name = member["name"]
            user.is_staff = True
            user.save(update_fields=["email", "first_name", "is_staff"])

        # Set role
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.role != member["role"]:
            profile.role = member["role"]
            profile.save(update_fields=["role"])

        # ─── Send welcome email ───
        try:
            from .mail_service import send_welcome
            base_url = getattr(settings, "BASE_URL", "https://vinculo-sync.codigomaison.com")
            send_welcome(to=user.email, name=user.first_name, email=user.email)
            logger.info("Welcome email sent to %s (%s)", user.email, user.username)
        except Exception as e:
            logger.warning("Could not send welcome email to %s: %s", user.email, e)

    # ─── Remove admin superuser if exists ───
    try:
        admin = User.objects.filter(username="admin", is_superuser=True).first()
        if admin:
            admin.delete()
            logger.info("Admin superuser deleted successfully")
    except Exception as e:
        logger.warning("Could not delete admin user: %s", e)

    # Mark done — never runs again unless cache is cleared
    cache.set(CACHE_KEY, True, timeout=None)
    logger.info("=== Startup initialization complete ===")
