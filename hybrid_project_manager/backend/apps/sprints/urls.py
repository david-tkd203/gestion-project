from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/sprint-status/<uuid:sprint_id>/", views.SprintStatusView.as_view(), name="sprint-status"),
    path("dashboard/sprint-burndown/<uuid:sprint_id>/", views.SprintBurndownView.as_view(), name="sprint-burndown"),
]
