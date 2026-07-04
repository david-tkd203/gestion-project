"""
Sprint Status Dashboard — "Estado de Sprint" view.

Provides:
  - Status breakdown by column
  - Blocked indicators with dependency info
  - Burndown chart data
  - Acceptance criteria progress
  - Timeline with evaluation dates
"""
import logging
from datetime import date, timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.core.models import Sprint, Tarea
from apps.core.serializers import TareaListSerializer

logger = logging.getLogger(__name__)


class SprintStatusView(APIView):
    """
    GET /api/dashboard/sprint-status/<sprint_id>/

    Returns the full Sprint Status dashboard payload:
      - sprint info
      - tasks grouped by status
      - blocked tasks with reasons
      - acceptance progress per task
      - timeline dates
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint = get_object_or_404(
            Sprint.objects.prefetch_related("tareas__dependencias"),
            id=sprint_id,
        )
        tasks = list(sprint.tareas.select_related("area").all())

        # ─── Status breakdown ───
        by_status = {}
        for t in tasks:
            label = dict(Tarea.Status.choices).get(t.status, t.status)
            by_status.setdefault(label, {
                "status": t.status,
                "label": label,
                "tasks": [],
                "count": 0,
            })
            by_status[label]["tasks"].append(TareaListSerializer(t).data)
            by_status[label]["count"] += 1

        # ─── Blocked tasks ───
        blocked = []
        agenda_blocked = []
        for t in tasks:
            if t.is_blocked:
                item = TareaListSerializer(t).data
                blocked.append(item)
                # Critical blocked: dependency chain
                if t.status != Tarea.Status.BACKLOG:
                    agenda_blocked.append(item)

        # ─── Acceptance criteria progress ───
        acceptance = {}
        total_criteria = 0
        done_criteria = 0
        for t in tasks:
            criteria = t.criterios_aceptacion or []
            d = sum(1 for c in criteria if c.get("done"))
            acceptance[t.codigo] = {
                "total": len(criteria),
                "done": d,
                "task_title": t.titulo[:80],
            }
            total_criteria += len(criteria)
            done_criteria += d

        # ─── Timeline ───
        today = date.today()
        sprint_duration = (sprint.fecha_fin - sprint.fecha_inicio).days or 1
        elapsed = (today - sprint.fecha_inicio).days
        time_progress = max(0, min(100, round(elapsed / sprint_duration * 100, 1)))

        # ─── Status flow progress ───
        # Ordered columns
        flow_order = [s[0] for s in Tarea.Status.choices]
        total_tasks = len(tasks)
        status_counts = {}
        for t in tasks:
            status_counts[t.status] = status_counts.get(t.status, 0) + 1

        # Cumulative progress (percentage of tasks at or beyond each column)
        flow_progress = []
        cumulative = 0
        for status_val, _ in Tarea.Status.choices:
            cumulative += status_counts.get(status_val, 0)
            flow_progress.append({
                "status": status_val,
                "label": dict(Tarea.Status.choices).get(status_val, status_val),
                "count": status_counts.get(status_val, 0),
                "cumulative_pct": round(cumulative / total_tasks * 100, 1) if total_tasks else 0,
            })

        return Response({
            "sprint": {
                "id": str(sprint.id),
                "codigo": sprint.codigo,
                "nombre": sprint.nombre,
                "fecha_inicio": sprint.fecha_inicio,
                "fecha_fin": sprint.fecha_fin,
                "color": sprint.color,
                "meet_link": sprint.meet_link,
                "meet_titulo": sprint.meet_titulo,
                "progress": sprint.progress,
            },
            "summary": {
                "total_tasks": total_tasks,
                "done_tasks": status_counts.get(Tarea.Status.DONE, 0),
                "blocked_count": len(blocked),
                "agenda_blocked_count": len(agenda_blocked),
                "acceptance_criteria_total": total_criteria,
                "acceptance_criteria_done": done_criteria,
                "acceptance_progress_pct": round(done_criteria / total_criteria * 100, 1) if total_criteria else 0,
                "time_progress_pct": time_progress,
                "days_remaining": max(0, (sprint.fecha_fin - today).days),
            },
            "by_status": by_status,
            "flow_progress": flow_progress,
            "blocked_tasks": blocked,
            "acceptance": acceptance,
        })


class SprintBurndownView(APIView):
    """
    GET /api/dashboard/sprint-burndown/<sprint_id>/

    Returns daily burndown data points for chart rendering.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id):
        sprint = get_object_or_404(Sprint, id=sprint_id)
        tasks = list(sprint.tareas.all())
        total = len(tasks)

        # Generate data points per day of sprint
        data_points = []
        current = sprint.fecha_inicio
        end = sprint.fecha_fin

        # Count tasks done on each day
        done_tasks = [t for t in tasks if t.status == Tarea.Status.DONE]

        # Simplified: assume tasks are linearly distributed
        day_count = max((end - current).days, 1)
        ideal_per_day = total / day_count

        while current <= end:
            elapsed = (current - sprint.fecha_inicio).days
            ideal_remaining = total - (ideal_per_day * elapsed)
            # Actual: we'd need a TaskHistory model for true per-day tracking
            # For now, show ideal line + markers
            data_points.append({
                "date": current.isoformat(),
                "ideal_remaining": round(max(0, ideal_remaining), 1),
            })
            current += timedelta(days=1)

        return Response({
            "sprint": sprint.codigo,
            "total_tasks": total,
            "done_tasks": len(done_tasks),
            "data_points": data_points,
        })
