from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = "Seed or reset initial development users (admin and david)"

    def handle(self, *args, **options):
        users_to_seed = [
            {
                "username": "admin",
                "email": "admin@vinculopm.local",
                "first_name": "Administrador",
                "password": "admin123",
                "role": "director",
                "is_superuser": True,
                "is_staff": True,
            },
            {
                "username": "david",
                "email": "david@vinculopm.local",
                "first_name": "David",
                "password": "david123",
                "role": "arquitecto",
                "is_superuser": False,
                "is_staff": True,
            },
        ]

        self.stdout.write(self.style.NOTICE("Seeding initial accounts..."))

        for u in users_to_seed:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "first_name": u["first_name"],
                    "is_staff": u["is_staff"],
                    "is_superuser": u["is_superuser"],
                },
            )
            user.set_password(u["password"])
            user.is_staff = u["is_staff"]
            user.is_superuser = u["is_superuser"]
            user.email = u["email"]
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = u["role"]
            profile.must_change_password = False
            profile.save()

            action = "Created" if created else "Updated/Reset"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [OK] {action}: '{user.username}' | Role: {profile.get_role_display()} | Password: '{u['password']}'"
                )
            )

        self.stdout.write(self.style.SUCCESS("User seeding complete."))
