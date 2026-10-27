import datetime
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.core.models import Proyecto, Sprint, Area, Tarea, UserProfile

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    test_user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )
    # Ensure profile exists
    profile, _ = UserProfile.objects.get_or_create(user=test_user)
    profile.role = UserProfile.Role.LECTOR
    profile.save()
    return test_user


@pytest.fixture
def director_user(db):
    director = User.objects.create_user(
        username="director",
        email="director@example.com",
        password="directorpass123",
        first_name="Director",
        last_name="User",
    )
    profile, _ = UserProfile.objects.get_or_create(user=director)
    profile.role = UserProfile.Role.DIRECTOR
    profile.save()
    return director


@pytest.fixture
def proyecto(db):
    return Proyecto.objects.create(
        nombre="Proyecto VINCULO Test",
        budget=100000.00,
        flujo_estados=["backlog", "desarrollo", "revision_legal", "qa", "done"],
    )


@pytest.fixture
def sprint(db, proyecto):
    return Sprint.objects.create(
        proyecto=proyecto,
        codigo="SP1",
        nombre="Sprint 1 - Fundación",
        descripcion="Sprint inicial de arquitectura",
        fecha_inicio=datetime.date(2026, 6, 1),
        fecha_fin=datetime.date(2026, 6, 14),
        color="#6366f1",
        orden=1,
    )


@pytest.fixture
def area(db):
    return Area.objects.create(
        codigo="DEV",
        nombre="Desarrollo",
        color="#3b82f6",
    )


@pytest.fixture
def tarea(db, proyecto, sprint, area, user):
    task = Tarea.objects.create(
        proyecto=proyecto,
        sprint=sprint,
        area=area,
        codigo="TK-001",
        titulo="Configuración inicial del sistema",
        responsable=user,
        responsable_nombre=f"{user.first_name} {user.last_name}",
        status=Tarea.Status.BACKLOG,
        criterios_aceptacion=[
            {"text": "Criterio 1: Base de datos configurada", "done": True},
            {"text": "Criterio 2: Cache y layers en memoria", "done": False},
        ],
        orden=1,
    )
    return task
