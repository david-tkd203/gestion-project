from django.contrib import admin
from .models import Proyecto, Sprint, Area, Tarea, Evento


@admin.register(Proyecto)
class ProyectoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "budget", "created_at")
    search_fields = ("nombre",)


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "proyecto", "fecha_inicio", "fecha_fin", "orden")
    list_filter = ("proyecto",)


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "color")


@admin.register(Tarea)
class TareaAdmin(admin.ModelAdmin):
    list_display = (
        "codigo", "sprint", "area", "titulo_short",
        "responsable_nombre", "status", "is_blocked", "fecha_inicio_estimada",
    )
    list_filter = ("status", "sprint__proyecto", "area", "sprint")
    search_fields = ("codigo", "titulo", "responsable_nombre")
    filter_horizontal = ("dependencias",)

    def titulo_short(self, obj):
        return obj.titulo[:80]

    titulo_short.short_description = "Título"


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "sprint", "fecha", "meet_link")
    list_filter = ("sprint__proyecto",)
