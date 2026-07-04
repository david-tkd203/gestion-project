from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GitHubConnectionViewSet,
    GitHubBranchViewSet,
    GitHubCommitListView,
    GitHubAlertListView,
    github_webhook,
)

router = DefaultRouter()
router.register(r"connections", GitHubConnectionViewSet, basename="github-connection")
router.register(r"branches", GitHubBranchViewSet, basename="github-branch")
router.register(r"commits", GitHubCommitListView, basename="github-commit")
router.register(r"alerts", GitHubAlertListView, basename="github-alert")

urlpatterns = [
    path("", include(router.urls)),
    path("webhook/", github_webhook, name="github-webhook"),
]
