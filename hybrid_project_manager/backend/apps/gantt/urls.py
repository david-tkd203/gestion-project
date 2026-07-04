from django.urls import path
from . import views

urlpatterns = [
    path("gantt/proyecto/<uuid:proyecto_id>/", views.ProyectoGanttView.as_view(), name="gantt-proyecto"),
    path("gantt/critical-path/<uuid:proyecto_id>/", views.CriticalPathView.as_view(), name="gantt-critical-path"),
]
