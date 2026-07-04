from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include("apps.core.urls")),
    path("api/", include("apps.tasks.urls")),
    path("api/", include("apps.sprints.urls")),
    path("api/", include("apps.gantt.urls")),
    path("api/github/", include("apps.github_sync.urls")),
]
