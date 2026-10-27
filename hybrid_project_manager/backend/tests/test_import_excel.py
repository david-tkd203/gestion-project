import pytest
from django.core.management import call_command
from apps.core.models import Proyecto, Sprint, Tarea
from apps.github_sync.models import GitHubConnection, GitHubBranch


@pytest.mark.django_db
def test_setup_vinculosync_command():
    call_command("setup_vinculosync")

    proyecto = Proyecto.objects.get(nombre="VINCULOsync")
    assert proyecto is not None

    sprints = Sprint.objects.filter(proyecto=proyecto)
    assert sprints.count() == 8

    tareas = Tarea.objects.filter(proyecto=proyecto)
    assert tareas.count() == 72

    # Check each sprint has tasks
    for sprint in sprints:
        assert sprint.tareas.count() > 0, f"Sprint {sprint.codigo} has no tasks"

    conn = GitHubConnection.objects.get(proyecto=proyecto)
    assert conn.repo_owner == "david-tkd203"
    assert conn.repo_name == "vinculosync"
    assert conn.repo_full_name == "david-tkd203/vinculosync"

    branch = GitHubBranch.objects.get(connection=conn, branch_name="main")
    assert branch.is_default is True


@pytest.mark.django_db
def test_import_excel_handles_duplicate_project_names(tmp_path):
    import os
    from apps.core.services import import_excel

    # Create duplicate projects
    p1 = Proyecto.objects.create(nombre="VINCULOsync")
    p2 = Proyecto.objects.create(nombre="VINCULOsync")

    file_path = os.path.abspath("backend/data/Tareas_VINCULOsync_FINAL.xlsx")
    result = import_excel(file_path, proyecto=p1)
    assert result.tareas_creadas == 72
    assert p1.tareas.count() == 72


@pytest.mark.django_db
def test_import_excel_api_endpoint(api_client, admin_user):
    import os
    from django.core.files.uploadedfile import SimpleUploadedFile

    p = Proyecto.objects.create(nombre="Test VINCULO")
    file_path = os.path.abspath("backend/data/Tareas_VINCULOsync_FINAL.xlsx")
    with open(file_path, "rb") as f:
        content = f.read()

    uploaded = SimpleUploadedFile(
        "Tareas_VINCULOsync_FINAL.xlsx",
        content,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        f"/api/proyectos/{p.id}/import-excel/",
        {"file": uploaded},
        format="multipart",
    )
    assert response.status_code == 200
    assert response.data["tareas"] == 72
    assert p.tareas.count() == 72
