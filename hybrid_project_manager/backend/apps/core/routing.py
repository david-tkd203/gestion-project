from django.urls import re_path
from .consumers import KanbanConsumer, SprintStatusConsumer

websocket_urlpatterns = [
    re_path(r"ws/kanban/(?P<proyecto_id>[^/]+)/$", KanbanConsumer.as_asgi()),
    re_path(r"ws/sprint/(?P<sprint_id>[^/]+)/$", SprintStatusConsumer.as_asgi()),
]
