import pytest
from django.core.management import call_command
from django.contrib.auth import get_user_model
from apps.core.models import UserProfile

User = get_user_model()


@pytest.mark.django_db
def test_seed_users_command():
    call_command("seed_users")

    # Check admin
    admin = User.objects.get(username="admin")
    assert admin.is_superuser is True
    assert admin.is_staff is True
    assert admin.check_password("admin123") is True
    assert admin.profile.role == UserProfile.Role.DIRECTOR
    assert admin.profile.must_change_password is False

    # Check david
    david = User.objects.get(username="david")
    assert david.is_staff is True
    assert david.check_password("david123") is True
    assert david.profile.role == UserProfile.Role.ARQUITECTO
    assert david.profile.must_change_password is False
