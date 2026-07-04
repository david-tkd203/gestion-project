"""Celery tasks for async Excel processing and Gantt recalculation."""
import logging
from celery import shared_task
from .services import import_excel
from .models import Tarea, Proyecto

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def import_excel_async(self, file_path: str, proyecto_nombre: str = "VINCULOsync"):
    """Async wrapper for import_excel — handles large files via Celery."""
    try:
        result = import_excel(file_path, proyecto_nombre)
        return {
            "success": result.success,
            "tareas": result.tareas_creadas,
            "sprints": result.sprints_creados,
            "deps_resueltas": result.dependencias_resueltas,
            "deps_fallidas": result.dependencias_fallidas,
            "usuarios_no_match": result.usuarios_no_encontrados,
            "message": str(result),
        }
    except Exception as exc:
        logger.exception("Async import failed")
        raise self.retry(exc=exc)


@shared_task
def recalculate_all_gantt_dates(proyecto_id: str):
    """Recalculate Gantt dates for all tasks in a project."""
    try:
        from django.db.models import Prefetch
        proyecto = Proyecto.objects.get(id=proyecto_id)
        tasks = list(Tarea.objects.filter(proyecto=proyecto).prefetch_related("dependencias"))

        # Build codigo map
        tareas_by_codigo = {t.codigo: t for t in tasks if t.codigo}

        from .services import _recalculate_gantt_dates
        _recalculate_gantt_dates(proyecto, tareas_by_codigo)

        return {"status": "ok", "tasks_updated": len(tasks)}
    except Exception as exc:
        logger.exception("Gantt recalc failed for %s", proyecto_id)
        return {"status": "error", "error": str(exc)}
