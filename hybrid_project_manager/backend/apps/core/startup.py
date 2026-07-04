"""
Startup initialization — runs once when the Django server starts.
Sends initial access emails to the team and removes the admin superuser.
"""
import logging
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.utils import OperationalError, ProgrammingError
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()


def initialize_platform():
    """
    One-time initialization after DB is ready:
    1. Creates/updates users for david.203.52@gmail.com and bduran@estudiante.uc.cl
    2. Assigns roles
    3. Sends welcome email with access info
    4. Removes the admin superuser
    """
    try:
        # Check if tables exist — count users just to test DB readiness
        User.objects.count()
    except (OperationalError, ProgrammingError):
        logger.warning("DB not ready yet — skipping startup init")
        return

    # Guard: only run once — check if target users already have roles assigned
    from .models import UserProfile
    david_user = User.objects.filter(email="david.203.52@gmail.com").first()
    if david_user:
        profile = UserProfile.objects.filter(user=david_user).first()
        if profile and profile.role == UserProfile.Role.ARQUITECTO:
            logger.info("Startup init already completed (users have roles)")
            return

    logger.info("=== Running startup initialization ===")

    team = [
        {"email": "david.203.52@gmail.com", "username": "david", "name": "David", "role": "arquitecto"},
        {"email": "bduran@estudiante.uc.cl", "username": "benjamin", "name": "Benjamin", "role": "director"},
    ]

    created_users = []

    for member in team:
        user, created = User.objects.get_or_create(
            username=member["username"],
            defaults={
                "email": member["email"],
                "first_name": member["name"],
                "is_staff": True,
            },
        )
        if not created:
            user.email = member["email"]
            user.first_name = member["name"]
            user.is_staff = True
            user.save(update_fields=["email", "first_name", "is_staff"])

        # Set role via UserProfile (signal creates it automatically)
        from .models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = member["role"]
        profile.save(update_fields=["role"])

        created_users.append(user)

    # ─── Send welcome emails ───
    try:
        from .mail_service import send_welcome
        base_url = getattr(settings, "BASE_URL", "https://vinculo-sync.codigomaison.com")
        for user in created_users:
            send_welcome(
                to=user.email,
                name=user.first_name,
                email=user.email,
            )
            logger.info("Welcome email sent to %s (%s)", user.email, user.username)
    except Exception as e:
        logger.warning("Could not send welcome emails: %s", e)

    # ─── Remove admin superuser if exists ───
    try:
        admin = User.objects.filter(username="admin", is_superuser=True).first()
        if admin:
            admin.delete()
            logger.info("Admin superuser deleted successfully")
    except Exception as e:
        logger.warning("Could not delete admin user: %s", e)

    logger.info("=== Startup initialization complete ===")
