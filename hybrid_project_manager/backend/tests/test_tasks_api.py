import pytest
from rest_framework import status


@pytest.mark.django_db
def test_tareas_list_unauthenticated(api_client):
    response = api_client.get("/api/tareas/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_tareas_list_authenticated(api_client, user, tarea):
    api_client.force_authenticate(user=user)
    response = api_client.get("/api/tareas/")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # If paginated, check results
    results = data.get("results") if isinstance(data, dict) and "results" in data else data
    assert isinstance(results, list)
    assert any(item["codigo"] == tarea.codigo for item in results)


@pytest.mark.django_db
def test_tareas_detail_authenticated(api_client, user, tarea):
    api_client.force_authenticate(user=user)
    response = api_client.get(f"/api/tareas/{tarea.id}/")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["id"] == str(tarea.id)
    assert data["codigo"] == tarea.codigo
    assert data["titulo"] == tarea.titulo
    assert "criterios_aceptacion" in data
    assert len(data["criterios_aceptacion"]) == 2


@pytest.mark.django_db
def test_tareas_filter_by_sprint(api_client, user, tarea, sprint):
    api_client.force_authenticate(user=user)
    response = api_client.get(f"/api/tareas/?sprint={sprint.id}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    results = data.get("results") if isinstance(data, dict) and "results" in data else data
    assert len(results) >= 1
    assert all(item["sprint"] == str(sprint.id) or item["sprint_codigo"] == sprint.codigo for item in results)
