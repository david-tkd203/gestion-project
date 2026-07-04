import logging
from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404


class IsAdminOrReadOnly(permissions.BasePermission):
    """Only director/arquitecto can write; everyone authenticated can read."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.profile.is_admin


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Lector can mutate only their own tasks. Admin can mutate any."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.profile.is_admin:
            return True
        return obj.responsable == request.user


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        return Response({
            "id": str(user.id),
            "username": user.username,
            "nombre_completo": f"{user.first_name} {user.last_name}".strip(),
            "role": profile.role if profile else "lector",
            "is_admin": profile.is_admin if profile else False,
        })

from .models import Proyecto, Sprint, Area, Tarea, Evento
from .serializers import (
    ProyectoSerializer,
    SprintSerializer,
    AreaSerializer,
    TareaListSerializer,
    TareaDetailSerializer,
    TareaStatusUpdateSerializer,
    TareaAcceptanceUpdateSerializer,
    EventoSerializer,
)
from .services import import_excel

logger = logging.getLogger(__name__)


class ProyectoViewSet(viewsets.ModelViewSet):
    queryset = Proyecto.objects.all()
    serializer_class = ProyectoSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["nombre"]

    @action(detail=True, methods=["post"], url_path="import-excel")
    def import_excel(self, request, pk=None):
        """Upload an Excel file and import it into this project."""
        proyecto = self.get_object()
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided. Send a file field named 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Save to temp location
        import tempfile
        import os

        suffix = os.path.splitext(file.name)[1] or ".xlsx"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            result = import_excel(tmp_path, proyecto_nombre=proyecto.nombre)
            if result.success:
                return Response({
                    "message": str(result),
                    "sprints": result.sprints_creados,
                    "tareas": result.tareas_creadas,
                    "deps_resueltas": result.dependencias_resueltas,
                    "deps_fallidas": result.dependencias_fallidas,
                    "usuarios_no_encontrados": result.usuarios_no_encontrados,
                })
            else:
                return Response(
                    {"error": "Import failed", "details": result.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            logger.exception("Import failed")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            import os
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


class SprintViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SprintSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["proyecto"]
    ordering = ["orden"]

    def get_queryset(self):
        return Sprint.objects.select_related("proyecto").all()

    @action(detail=True, methods=["get"], url_path="burndown")
    def burndown(self, request, pk=None):
        """Returns burndown data: total tasks vs done tasks per day."""
        sprint = self.get_object()
        tasks = sprint.tareas.all()
        total = tasks.count()
        done = tasks.filter(status=Tarea.Status.DONE).count()
        # Simple burndown: start→end with linear ideal
        from datetime import date, timedelta
        start = sprint.fecha_inicio
        end = sprint.fecha_fin
        days = max((end - start).days, 1)
        ideal_per_day = total / days if days > 0 else 0

        # Actual: could log per-day changes, but for now return current
        return Response({
            "sprint": sprint.codigo,
            "total_tasks": total,
            "done_tasks": done,
            "remaining": total - done,
            "progress_pct": sprint.progress,
            "start": start,
            "end": end,
        })


class TareaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "sprint", "area", "is_blocked", "proyecto"]
    search_fields = ["codigo", "titulo", "responsable_nombre"]
    ordering_fields = ["sprint__orden", "orden", "fecha_inicio_estimada", "status"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TareaDetailSerializer
        return TareaListSerializer

    def get_queryset(self):
        return Tarea.objects.select_related(
            "sprint", "area", "responsable"
        ).prefetch_related("dependencias").all()

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """Move task to new status with blocked check."""
        tarea = self.get_object()
        if not request.user.profile.is_admin and tarea.responsable != request.user:
            return Response(
                {"detail": "Solo el responsable o un administrador pueden cambiar el estado"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TareaStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tarea = serializer.update(tarea, serializer.validated_data)
        return Response(TareaListSerializer(tarea).data)

    @action(detail=True, methods=["patch"], url_path="acceptance")
    def toggle_acceptance(self, request, pk=None):
        """Toggle an acceptance criterion check."""
        tarea = self.get_object()
        if not request.user.profile.is_admin and tarea.responsable != request.user:
            return Response(
                {"detail": "Solo el responsable o un administrador pueden modificar criterios"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TareaAcceptanceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tarea = serializer.update(tarea, serializer.validated_data)
        return Response({"acceptance_progress": tarea.acceptance_progress})

    @action(detail=True, methods=["post"], url_path="recheck-blocked")
    def recheck_blocked(self, request, pk=None):
        """Re-evaluate blocked status from dependencies."""
        tarea = self.get_object()
        tarea.check_blocked()
        tarea.save(update_fields=["is_blocked", "blocked_reason"])
        return Response({
            "is_blocked": tarea.is_blocked,
            "blocked_reason": tarea.blocked_reason,
        })

    @action(detail=True, methods=["post"], url_path="block")
    def block(self, request, pk=None):
        """Manually block a task (admin only)."""
        if not request.user.profile.is_admin:
            return Response(
                {"detail": "Solo el Director o el Arquitecto pueden modificar"},
                status=status.HTTP_403_FORBIDDEN,
            )
        tarea = self.get_object()
        reason = request.data.get("blocked_reason", "Bloqueado manualmente")
        tarea.is_manually_blocked = True
        tarea.is_blocked = True
        tarea.blocked_reason = reason
        tarea.save(update_fields=["is_manually_blocked", "is_blocked", "blocked_reason"])
        return Response(TareaDetailSerializer(tarea).data)

    @action(detail=True, methods=["post"], url_path="unblock")
    def unblock(self, request, pk=None):
        """Unblock a task (admin only)."""
        if not request.user.profile.is_admin:
            return Response(
                {"detail": "Solo el Director o el Arquitecto pueden modificar"},
                status=status.HTTP_403_FORBIDDEN,
            )
        tarea = self.get_object()
        tarea.is_manually_blocked = False
        tarea.is_blocked = False
        tarea.blocked_reason = ""
        tarea.save(update_fields=["is_manually_blocked", "is_blocked", "blocked_reason"])
        # Re-check dependency-based blocking
        tarea.check_blocked()
        tarea.save(update_fields=["is_blocked", "blocked_reason"])
        return Response(TareaDetailSerializer(tarea).data)

    @action(detail=True, methods=["patch"], url_path="criterios")
    def update_criterios(self, request, pk=None):
        """Replace acceptance criteria list (admin only)."""
        if not request.user.profile.is_admin:
            return Response(
                {"detail": "Solo el Director o el Arquitecto pueden modificar"},
                status=status.HTTP_403_FORBIDDEN,
            )
        tarea = self.get_object()
        tarea.criterios_aceptacion = request.data.get("criterios_aceptacion", [])
        tarea.save(update_fields=["criterios_aceptacion"])
        return Response({"acceptance_progress": tarea.acceptance_progress})


class AreaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]


class EventoViewSet(viewsets.ModelViewSet):
    serializer_class = EventoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["sprint", "tarea", "proyecto"]

    def get_queryset(self):
        return Evento.objects.select_related("sprint").all()
