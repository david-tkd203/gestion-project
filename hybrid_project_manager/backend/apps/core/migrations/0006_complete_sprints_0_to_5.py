from django.db import migrations


def mark_sprints_0_to_5_done(apps, schema_editor):
    Sprint = apps.get_model("core", "Sprint")
    Tarea = apps.get_model("core", "Tarea")

    # Sprints SP0 to SP5 (orden <= 5) are 100% complete
    sprints = Sprint.objects.filter(orden__lte=5)
    for sprint in sprints:
        for tarea in sprint.tareas.all():
            tarea.status = "done"
            tarea.estado_excel = "completado"
            tarea.completitud_pct = 100
            tarea.is_blocked = False
            tarea.blocked_reason = ""
            if tarea.criterios_aceptacion:
                criterios = []
                for item in tarea.criterios_aceptacion:
                    item["done"] = True
                    criterios.append(item)
                tarea.criterios_aceptacion = criterios
            tarea.save(update_fields=["status", "estado_excel", "completitud_pct", "is_blocked", "blocked_reason", "criterios_aceptacion"])


def reverse_mark(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_pendiente"),
    ]

    operations = [
        migrations.RunPython(mark_sprints_0_to_5_done, reverse_mark),
    ]
