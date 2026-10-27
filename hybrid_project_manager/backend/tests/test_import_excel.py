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
