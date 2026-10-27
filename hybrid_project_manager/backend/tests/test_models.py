import pytest
from apps.core.models import Proyecto, Sprint, Tarea


@pytest.mark.django_db
def test_proyecto_model(proyecto):
    assert str(proyecto) == "Proyecto VINCULO Test"
    assert proyecto.budget == 100000.00
    assert "backlog" in proyecto.flujo_estados


@pytest.mark.django_db
def test_sprint_progress_empty(sprint):
    # No tasks assigned
    assert sprint.progress == 0.0


@pytest.mark.django_db
def test_sprint_progress_calculation(sprint, area, user):
    t1 = Tarea.objects.create(
        proyecto=sprint.proyecto,
        sprint=sprint,
        area=area,
        codigo="TK-010",
        titulo="Tarea 1",
        responsable=user,
        status=Tarea.Status.DONE,
    )
    t2 = Tarea.objects.create(
        proyecto=sprint.proyecto,
        sprint=sprint,
        area=area,
        codigo="TK-011",
        titulo="Tarea 2",
        responsable=user,
        status=Tarea.Status.DESARROLLO,
    )

    # 1 of 2 done -> 50.0%
    assert sprint.progress == 50.0

    # Move t2 to done -> 100.0%
    t2.status = Tarea.Status.DONE
    t2.save()
    assert sprint.progress == 100.0


@pytest.mark.django_db
def test_tarea_acceptance_progress(tarea):
    # In fixture, 1 of 2 is done -> 50.0%
    assert tarea.acceptance_progress == 50.0

    # All done -> 100.0%
    tarea.criterios_aceptacion = [
        {"text": "Criterio 1", "done": True},
        {"text": "Criterio 2", "done": True},
    ]
    tarea.save()
    assert tarea.acceptance_progress == 100.0

    # Empty criteria -> 0.0%
    tarea.criterios_aceptacion = []
    tarea.save()
    assert tarea.acceptance_progress == 0.0


@pytest.mark.django_db
def test_tarea_check_blocked_with_dependencies(proyecto, sprint, area, user):
    dep_task = Tarea.objects.create(
        proyecto=proyecto,
        sprint=sprint,
        area=area,
        codigo="DEP-001",
        titulo="Dependencia requerida",
        responsable=user,
        status=Tarea.Status.DESARROLLO,
    )
    main_task = Tarea.objects.create(
        proyecto=proyecto,
        sprint=sprint,
        area=area,
        codigo="MAIN-001",
        titulo="Tarea principal",
        responsable=user,
        status=Tarea.Status.BACKLOG,
    )
    main_task.dependencias.add(dep_task)

    # Dependency is not DONE -> main_task must be blocked
    is_blocked = main_task.check_blocked()
    assert is_blocked is True
    assert main_task.is_blocked is True
    assert "DEP-001" in main_task.blocked_reason

    # Mark dependency as DONE -> main_task becomes unblocked
    dep_task.status = Tarea.Status.DONE
    dep_task.save()

    is_blocked_after = main_task.check_blocked()
    assert is_blocked_after is False
    assert main_task.is_blocked is False
    assert main_task.blocked_reason == ""


@pytest.mark.django_db
def test_tarea_check_blocked_manually_blocked(tarea):
    tarea.is_manually_blocked = True
    assert tarea.check_blocked() is True
    assert tarea.is_blocked is False  # manual block check returns True directly
