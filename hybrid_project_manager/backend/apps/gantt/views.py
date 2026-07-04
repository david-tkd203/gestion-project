"""
Gantt Chart API — timeline horizontal con ruta crítica.

Provides:
  - All tasks with start/end dates per sprint for SVG rendering
  - Critical path identification (longest dependency chain)
  - Dependency edges for arrow rendering
"""
import logging
from collections import defaultdict, deque

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.core.models import Proyecto, Sprint, Tarea
from apps.core.serializers import TareaListSerializer

logger = logging.getLogger(__name__)


class ProyectoGanttView(APIView):
    """
    GET /api/gantt/proyecto/<proyecto_id>/

    Returns all tasks grouped by sprint with dates, colors, and dependency edges
    for rendering an interactive Gantt chart.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, proyecto_id):
        proyecto = get_object_or_404(Proyecto, id=proyecto_id)
        sprints = Sprint.objects.filter(proyecto=proyecto).order_by("orden")
        tasks = Tarea.objects.filter(
            proyecto=proyecto
        ).select_related("area", "sprint").prefetch_related("dependencias").order_by(
            "sprint__orden", "orden"
        )

        # ─── Build sprint blocks ───
        sprint_blocks = []
        for s in sprints:
            sprint_tasks = [t for t in tasks if t.sprint_id == s.id]
            sprint_blocks.append({
                "id": str(s.id),
                "codigo": s.codigo,
                "nombre": s.nombre,
                "fecha_inicio": s.fecha_inicio,
                "fecha_fin": s.fecha_fin,
                "color": s.color,
                "meet_link": s.meet_link,
                "task_count": len(sprint_tasks),
                "tasks": [TareaListSerializer(t).data for t in sprint_tasks],
            })

        # ─── Timeline bounds ───
        if sprints:
            timeline_start = sprints[0].fecha_inicio
            timeline_end = sprints.last().fecha_fin
        else:
            timeline_start = None
            timeline_end = None

        # ─── Dependency edges for arrows ───
        edges = []
        for t in tasks:
            for dep in t.dependencias.all():
                edges.append({
                    "from": dep.codigo,
                    "to": t.codigo,
                    "from_id": str(dep.id),
                    "to_id": str(t.id),
                })

        return Response({
            "proyecto": {"id": str(proyecto.id), "nombre": proyecto.nombre},
            "timeline": {
                "start": timeline_start,
                "end": timeline_end,
                "sprint_count": len(sprint_blocks),
                "total_tasks": len(tasks),
            },
            "sprints": sprint_blocks,
            "edges": edges,
        })


class CriticalPathView(APIView):
    """
    GET /api/gantt/critical-path/<proyecto_id>/

    Identifies the critical path using topological sort + longest path.
    Returns ordered list of task codes on the critical path.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, proyecto_id):
        proyecto = get_object_or_404(Proyecto, id=proyecto_id)
        tasks = list(
            Tarea.objects.filter(proyecto=proyecto)
            .select_related("area", "sprint")
            .prefetch_related("dependencias")
        )

        if not tasks:
            return Response({"critical_path": [], "length_days": 0})

        # ─── Build DAG ───
        task_map = {t.id: t for t in tasks}
        graph = defaultdict(list)
        reverse_graph = defaultdict(list)
        in_degree = {t.id: 0 for t in tasks}
        durations = {}

        for t in tasks:
            dur = t.duracion_dias or 1
            durations[t.id] = dur
            for dep in t.dependencias.all():
                if dep.id in task_map:
                    graph[dep.id].append(t.id)
                    reverse_graph[t.id].append(dep.id)
                    in_degree[t.id] = in_degree.get(t.id, 0) + 1

        # ─── Topological sort ───
        queue = deque([t.id for t in tasks if in_degree.get(t.id, 0) == 0])
        topo = []
        while queue:
            nid = queue.popleft()
            topo.append(nid)
            for neighbor in graph[nid]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(topo) < len(tasks):
            return Response({
                "error": "Cycle detected in dependency graph",
                "critical_path": [],
                "length_days": 0,
            })

        # ─── Forward pass: earliest start ───
        earliest_start = {t.id: 0 for t in tasks}
        earliest_finish = {}
        for nid in topo:
            ef = earliest_start[nid] + durations[nid]
            earliest_finish[nid] = ef
            for neighbor in graph[nid]:
                if earliest_start[neighbor] < ef:
                    earliest_start[neighbor] = ef

        # ─── Backward pass: latest start ───
        project_end = max(earliest_finish.values())
        latest_finish = {t.id: project_end for t in tasks}
        latest_start = {}
        for nid in reversed(topo):
            lf = latest_finish[nid]
            ls = lf - durations[nid]
            latest_start[nid] = ls
            for pred in reverse_graph[nid]:
                if latest_finish[pred] > ls:
                    latest_finish[pred] = ls

        # ─── Float = 0 → critical path ───
        critical_path = []
        for nid in topo:
            total_float = latest_start[nid] - earliest_start[nid]
            if abs(total_float) < 0.01:
                t = task_map[nid]
                critical_path.append({
                    "codigo": t.codigo,
                    "titulo": t.titulo[:80],
                    "sprint": t.sprint.codigo,
                    "area": t.area.codigo if t.area else None,
                    "area_color": t.area.color if t.area else "#999",
                    "start_day": earliest_start[nid],
                    "duration": durations[nid],
                })

        return Response({
            "critical_path": critical_path,
            "length_days": project_end,
            "total_tasks": len(tasks),
        })
