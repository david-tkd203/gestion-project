from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import UserProfile

User = get_user_model()

ROLE_MAP = {
    "benjamin": "director",
    "david": "arquitecto",
    "admin": "director",  # superuser admin
    # everyone else gets lector (default)
}


class Command(BaseCommand):
    help = "Assign roles to team members based on username"

    def handle(self, *args, **options):
        for username, role in ROLE_MAP.items():
            try:
                user = User.objects.get(username=username)
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.role = role
                profile.save()
                self.stdout.write(self.style.SUCCESS(f"  {username} -> {role}"))
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"  User '{username}' not found"
                ))

        # Ensure all other users have a profile
        for user in User.objects.filter(profile__isnull=True):
            UserProfile.objects.create(user=user, role="lector")
            self.stdout.write(f"  {user.username} -> lector (auto-created)")
