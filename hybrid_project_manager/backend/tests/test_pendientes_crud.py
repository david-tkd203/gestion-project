import pytest
from rest_framework import status
from apps.core.models import Pendiente, Sprint, Tarea


@pytest.mark.django_db
def test_pendientes_crud(api_client, user, proyecto):
    api_client.force_authenticate(user=user)

    # 1. Create
    payload = {
        "proyecto": str(proyecto.id),
        "titulo": "Reunión Dirección de Innovación",
        "tipo": "institucion",
        "institucion": "Ministerio de Educación",
        "persona_contacto": "Ana Torres",
        "fecha": "2026-11-05",
        "hora": "10:00",
        "lugar_o_link": "https://meet.google.com/xyz",
        "temas_tratados": "Presentación de avances",
        "acuerdos": [{"id": "1", "texto": "Enviar minuta", "done": False}],
        "estado": "pendiente",
        "prioridad": "alta",
        "responsable_nombre": "David",
    }
    create_res = api_client.post("/api/pendientes/", payload, format="json")
    assert create_res.status_code == status.HTTP_201_CREATED
    pen_id = create_res.json()["id"]

    # 2. List
    list_res = api_client.get("/api/pendientes/")
    assert list_res.status_code == status.HTTP_200_OK
    assert len(list_res.json()) >= 1

    # 3. Update
    patch_res = api_client.patch(f"/api/pendientes/{pen_id}/", {"estado": "completado"}, format="json")
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["estado"] == "completado"

    # 4. Delete
    del_res = api_client.delete(f"/api/pendientes/{pen_id}/")
    assert del_res.status_code == status.HTTP_204_NO_CONTENT
    assert not Pendiente.objects.filter(id=pen_id).exists()


@pytest.mark.django_db
def test_sprint_crud(api_client, user, proyecto):
    api_client.force_authenticate(user=user)

    # 1. Create Sprint
    payload = {
        "proyecto": str(proyecto.id),
        "codigo": "SP99",
        "nombre": "Sprint 99 - Cierre",
        "orden": 99,
        "fecha_inicio": "2026-12-01",
        "fecha_fin": "2026-12-15",
        "color": "#10b981",
        "link_meet": "https://meet.google.com/sp99",
    }
    res = api_client.post("/api/sprints/", payload, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    sprint_id = res.json()["id"]

    # 2. Update Sprint
    patch_res = api_client.patch(f"/api/sprints/{sprint_id}/", {"nombre": "Sprint 99 - Updated"}, format="json")
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["nombre"] == "Sprint 99 - Updated"

    # 3. Delete Sprint
    del_res = api_client.delete(f"/api/sprints/{sprint_id}/")
    assert del_res.status_code == status.HTTP_204_NO_CONTENT
    assert not Sprint.objects.filter(id=sprint_id).exists()


@pytest.mark.django_db
def test_tarea_crud_and_status_update(api_client, user, sprint, proyecto, area):
    api_client.force_authenticate(user=user)

    # 1. Create Tarea
    payload = {
        "proyecto": str(proyecto.id),
        "sprint": str(sprint.id),
        "codigo": "TK-999",
        "titulo": "Implementar módulo de reportes",
        "area": area.codigo,
        "status": "backlog",
        "criterios_aceptacion": [{"id": "c1", "texto": "Reportes en PDF", "done": False}],
    }
    res = api_client.post("/api/tareas/", payload, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    task_id = res.json()["id"]

    # 2. Update Status (Kanban movement)
    move_res = api_client.patch(f"/api/tareas/{task_id}/status/", {"status": "desarrollo"}, format="json")
    assert move_res.status_code == status.HTTP_200_OK
    assert move_res.json()["status"] == "desarrollo"

    # 3. Delete Tarea
    del_res = api_client.delete(f"/api/tareas/{task_id}/")
    assert del_res.status_code == status.HTTP_204_NO_CONTENT
    assert not Tarea.objects.filter(id=task_id).exists()
