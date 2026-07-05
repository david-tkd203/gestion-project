from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProyectoViewSet, SprintViewSet, TareaViewSet,
    AreaViewSet, EventoViewSet, MeView, ChangePasswordView,
)

router = DefaultRouter()
router.register(r"proyectos", ProyectoViewSet, basename="proyecto")
router.register(r"sprints", SprintViewSet, basename="sprint")
router.register(r"tareas", TareaViewSet, basename="tarea")
router.register(r"areas", AreaViewSet, basename="area")
router.register(r"eventos", EventoViewSet, basename="evento")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("", include(router.urls)),
]
