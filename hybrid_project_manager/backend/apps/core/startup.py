"""
Startup initialization — runs once when the Django server starts.
Creates initial users, generates passwords, sends credentials email
with must_change_password flag, and removes the admin superuser.
"""
import secrets
import string
import logging
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.utils import OperationalError, ProgrammingError
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()

CACHE_KEY = "vinculo_startup_init_done"


def _generate_password(length=14):
    """Generate a secure random password with all character types."""
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    symbols = "!@#$%^&*()_+-=[]{}|;':,./<>?`~"

    # Ensure at least one of each type
    chars = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(symbols),
    ]
    # Fill the rest with random
    all_chars = uppercase + lowercase + digits + symbols
    chars.extend(secrets.choice(all_chars) for _ in range(length - 4))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


ROLE_LABELS = {
    "director": "Director de Proyecto",
    "arquitecto": "Arquitecto y Desarrollo Tecnico",
    "lector": "Solo Lectura",
}


def initialize_platform():
    """
    One-time initialization:
    1. Creates users with random passwords
    2. Sets must_change_password=True
    3. Emails credentials to each user
    4. Removes the admin superuser
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

        # Generate password + set must_change
        password = _generate_password()
        user.set_password(password)
        user.save(update_fields=["password"])

        # Set role + must_change_password flag
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = member["role"]
        profile.must_change_password = True
        profile.save(update_fields=["role", "must_change_password"])

        # ─── Send welcome email with credentials ───
        try:
            from .mail_service import send_welcome
            send_welcome(
                to=user.email,
                name=user.first_name,
                email=user.email,
                username=user.username,
                password=password,
                role=ROLE_LABELS.get(member["role"], member["role"]),
            )
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

    cache.set(CACHE_KEY, True, timeout=None)
    logger.info("=== Startup initialization complete ===")
