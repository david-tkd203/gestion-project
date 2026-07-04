from rest_framework import serializers
from .models import Proyecto, Sprint, Area, Tarea, Evento


class ProyectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proyecto
        fields = "__all__"


class SprintSerializer(serializers.ModelSerializer):
    progress = serializers.ReadOnlyField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = "__all__"

    def get_task_count(self, obj):
        return obj.tareas.count()


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = "__all__"


class TareaListSerializer(serializers.ModelSerializer):
    sprint_codigo = serializers.CharField(source="sprint.codigo", read_only=True)
    area_color = serializers.ReadOnlyField()
    acceptance_progress = serializers.ReadOnlyField()
    dependencias_codigos = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = [
            "id", "codigo", "titulo", "status", "area", "area_color",
            "sprint", "sprint_codigo", "responsable_nombre",
            "is_blocked", "blocked_reason",
            "fecha_inicio_estimada", "fecha_fin_estimada",
            "acceptance_progress", "dependencias_codigos", "orden",
            # New fields (v2.0)
            "tipo_tarea", "complejidad", "estado_excel", "completitud_pct",
            "riesgo_mitigacion", "stack_especifico", "rama_github", "evidencia_codigo",
        ]

    def get_dependencias_codigos(self, obj):
        return list(obj.dependencias.values_list("codigo", flat=True))


class TareaDetailSerializer(serializers.ModelSerializer):
    sprint_codigo = serializers.CharField(source="sprint.codigo", read_only=True)
    area_color = serializers.ReadOnlyField()
    acceptance_progress = serializers.ReadOnlyField()
    dependencias = TareaListSerializer(many=True, read_only=True)
    blocked_by = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = "__all__"

    def get_blocked_by(self, obj):
        from .models import Tarea
        qs = Tarea.objects.filter(dependencias=obj)
        return TareaListSerializer(qs, many=True).data


class TareaStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Tarea.Status.choices)
    check_blocked = serializers.BooleanField(default=True)

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        if validated_data.get("check_blocked", True):
            instance.check_blocked()
        instance.save()
        return instance


class TareaAcceptanceUpdateSerializer(serializers.Serializer):
    index = serializers.IntegerField(min_value=0)
    done = serializers.BooleanField()

    def update(self, instance, validated_data):
        idx = validated_data["index"]
        if idx < len(instance.criterios_aceptacion):
            instance.criterios_aceptacion[idx]["done"] = validated_data["done"]
            instance.save(update_fields=["criterios_aceptacion"])
        return instance


class EventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento
        fields = "__all__"
