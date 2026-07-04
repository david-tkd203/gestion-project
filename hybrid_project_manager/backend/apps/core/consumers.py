import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Tarea, Sprint, Proyecto
from .serializers import TareaListSerializer, SprintSerializer

logger = logging.getLogger(__name__)


class KanbanConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time Kanban updates.

    Clients connect to ws/kanban/<proyecto_id>/
    Messages:
      - type: "task_moved"  →  { tarea_id, from_status, to_status }
      - type: "task_updated" →  { tarea_id, ...fields }
      - type: "ping"         →  { type: "pong" }
    """

    async def connect(self):
        self.proyecto_id = self.scope["url_route"]["kwargs"]["proyecto_id"]
        self.group_name = f"kanban_{self.proyecto_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("Kanban WS connected: %s", self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        if msg_type == "task_moved":
            # Broadcast to the whole group
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "task_moved",
                    "tarea_id": data.get("tarea_id"),
                    "from_status": data.get("from_status"),
                    "to_status": data.get("to_status"),
                    "codigo": data.get("codigo"),
                },
            )
        elif msg_type == "task_updated":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "task_updated",
                    "tarea_id": data.get("tarea_id"),
                    "fields": data.get("fields", {}),
                },
            )

    async def task_moved(self, event):
        await self.send(text_data=json.dumps(event))

    async def task_updated(self, event):
        await self.send(text_data=json.dumps(event["fields"]))


class SprintStatusConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time Sprint Status monitoring.

    Clients connect to ws/sprint/<sprint_id>/
    Broadcasts progress updates, blocked indicators, burndown.
    """

    async def connect(self):
        self.sprint_id = self.scope["url_route"]["kwargs"]["sprint_id"]
        self.group_name = f"sprint_{self.sprint_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial state
        await self.send_sprint_state()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def send_sprint_state(self):
        state = await self._build_sprint_state()
        await self.send(text_data=json.dumps({"type": "sprint_state", **state}))

    @database_sync_to_async
    def _build_sprint_state(self):
        try:
            sprint = Sprint.objects.prefetch_related("tareas__dependencias").get(
                id=self.sprint_id
            )
        except Sprint.DoesNotExist:
            return {"error": "Sprint not found"}

        tasks = list(sprint.tareas.all())
        total = len(tasks)

        # Group by status
        by_status = {}
        for t in tasks:
            by_status.setdefault(t.status, []).append(TareaListSerializer(t).data)

        # Blocked tasks
        blocked = [
            TareaListSerializer(t).data
            for t in tasks
            if t.is_blocked
        ]

        # Acceptance progress per task
        acceptance = {
            t.codigo: {
                "total": len(t.criterios_aceptacion),
                "done": sum(1 for c in t.criterios_aceptacion if c.get("done")),
            }
            for t in tasks
        }

        return {
            "sprint": SprintSerializer(sprint).data,
            "total_tasks": total,
            "progress_pct": sprint.progress,
            "by_status": by_status,
            "blocked_tasks": blocked,
            "acceptance": acceptance,
        }

    async def sprint_update(self, event):
        """Broadcast group update when any task changes."""
        await self.send_sprint_state()
