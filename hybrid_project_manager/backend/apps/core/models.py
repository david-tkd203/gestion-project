import uuid
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator

User = get_user_model()


# ─── Week utility: parses "Junio S2" into real calendar dates ───
MONTH_MAP = {
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}

import datetime
import re


def parse_week_spec(spec: str, base_year: int = 2026) -> datetime.date | None:
    """'Junio S2' → date of the Monday of that week."""
    m = re.match(r"(\w+)\s*S(\d)", spec.strip(), re.IGNORECASE)
    if not m:
        return None
    month_name = m.group(1).lower()
    week_num = int(m.group(2))
    month = MONTH_MAP.get(month_name)
    if not month or week_num < 1 or week_num > 4:
        return None
    # Find the Monday of week N in that month
    first_day = datetime.date(base_year, month, 1)
    # Week 1 = days 1-7, week 2 = 8-14, etc.
    day_of_month = (week_num - 1) * 7 + 1
    if day_of_month > 28:
        # clamp to last day
        import calendar
        last = calendar.monthrange(base_year, month)[1]
        day_of_month = min(day_of_month, last)
    candidate = datetime.date(base_year, month, day_of_month)
    # Adjust to Monday
    return candidate - datetime.timedelta(days=candidate.weekday())


def parse_duration_range(range_str: str, base_year: int = 2026):
    """'Junio S2 - Julio S1' → (start_date, end_date)."""
    parts = [p.strip() for p in range_str.split("-")]
    if len(parts) != 2:
        return None, None
    start = parse_week_spec(parts[0], base_year)
    end = parse_week_spec(parts[1], base_year)
    if start and end:
        end += datetime.timedelta(days=6)  # end of the week (Sunday)
    return start, end


def parse_acceptance_criteria(text: str) -> list:
    """Parse checkbox list ☐ into structured checklist."""
    items = []
    for line in text.strip().split("\n"):
        line = line.strip()
        cleaned = re.sub(r"^[☐✅❌★]\s*", "", line).strip()
        if cleaned:
            items.append({"text": cleaned, "done": False})
    return items


# ─── Models ───


class Proyecto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=255)
    budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    flujo_estados = models.JSONField(
        default=list,
        help_text="Custom flow states, e.g. ['backlog','desarrollo','revision_legal','qa','done']",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Proyecto"
        verbose_name_plural = "Proyectos"

    def __str__(self):
        return self.nombre


class Sprint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(
        Proyecto, on_delete=models.CASCADE, related_name="sprints"
    )
    codigo = models.CharField(max_length=10)  # SP0-SP7
    nombre = models.CharField(max_length=255)  # "Sprint 0"
    descripcion = models.TextField(blank=True, default="")
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    color = models.CharField(max_length=7, default="#6366f1")  # Hex
    orden = models.IntegerField(validators=[MinValueValidator(0)])
    meet_link = models.URLField(blank=True, default="")
    meet_titulo = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["orden"]
        unique_together = [("proyecto", "codigo")]

    def __str__(self):
        return f"{self.codigo} — {self.nombre}"

    @property
    def progress(self) -> float:
        """% of tasks in this sprint that are DONE."""
        total = self.tareas.count()
        if total == 0:
            return 0.0
        done = self.tareas.filter(status=Tarea.Status.DONE).count()
        return round(done / total * 100, 1)


class Area(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True)  # DIR, ARQ, GEST...
    nombre = models.CharField(max_length=255)  # "Dirección de Proyecto"
    color = models.CharField(max_length=7, default="#6b7280")

    def __str__(self):
        return f"{self.codigo} — {self.nombre}"


class UserProfile(models.Model):
    class Role(models.TextChoices):
        DIRECTOR = "director", "Director de Proyecto"
        ARQUITECTO = "arquitecto", "Arquitecto y Desarrollo Técnico"
        LECTOR = "lector", "Solo Lectura"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.LECTOR
    )

    def __str__(self):
        return f"{self.user.username} — {self.get_role_display()}"

    @property
    def is_admin(self) -> bool:
        return self.user.is_superuser or self.role in (self.Role.DIRECTOR, self.Role.ARQUITECTO)


class Tarea(models.Model):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        DESARROLLO = "desarrollo", "Desarrollo"
        REVISION_LEGAL = "revision_legal", "Revisión Legal"
        QA = "qa", "QA"
        DONE = "done", "Done"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(
        Proyecto, on_delete=models.CASCADE, related_name="tareas"
    )
    sprint = models.ForeignKey(
        Sprint, on_delete=models.CASCADE, related_name="tareas"
    )
    codigo = models.CharField(max_length=20, unique=True)
    area = models.ForeignKey(
        Area, on_delete=models.PROTECT, related_name="tareas"
    )
    titulo = models.CharField(max_length=512)
    responsable = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tareas_asignadas",
    )
    responsable_nombre = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Raw name from Excel before user matching",
    )
    dependencias = models.ManyToManyField(
        "self", symmetrical=False, blank=True,
        help_text="Tasks that must be DONE before this one can start",
    )
    especificaciones_tecnicas = models.TextField(blank=True, default="")
    criterios_aceptacion = models.JSONField(
        default=list,
        help_text="List of {text, done} objects",
    )
    participantes_data = models.JSONField(
        default=dict, blank=True,
        help_text="Raw participant info from Excel",
    )
    class TipoTarea(models.TextChoices):
        BACKEND = "backend", "Backend"
        FRONTEND = "frontend", "Frontend"
        FULLSTACK = "fullstack", "Fullstack"
        DEVOPS = "devops", "DevOps/Arquitectura"
        GESTION = "gestion", "Gestion"
        DISENO = "diseno", "Diseno"
        OTROS = "otros", "Otros"

    class Complejidad(models.TextChoices):
        BAJA = "baja", "Baja"
        MEDIA = "media", "Media"
        ALTA = "alta", "Alta"
        EXTREMA = "extrema", "Extrema"

    class EstadoExcel(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        EN_PROGRESO = "en_progreso", "En Progreso"
        COMPLETADO = "completado", "Completado"
        BLOQUEADO = "bloqueado", "Bloqueado"

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.BACKLOG
    )
    tipo_tarea = models.CharField(
        max_length=20, choices=TipoTarea.choices, default=TipoTarea.OTROS,
        help_text="Backend, Frontend, Fullstack, DevOps, Gestion, Diseno"
    )
    complejidad = models.CharField(
        max_length=10, choices=Complejidad.choices, default=Complejidad.MEDIA,
    )
    estado_excel = models.CharField(
        max_length=20, choices=EstadoExcel.choices, default=EstadoExcel.PENDIENTE,
        help_text="Tracking status from Excel (separate from workflow status)"
    )
    completitud_pct = models.IntegerField(
        default=0,
        help_text="0-100 percentage from Excel"
    )
    riesgo_mitigacion = models.TextField(blank=True, default="")
    stack_especifico = models.CharField(max_length=300, blank=True, default="")
    rama_github = models.CharField(max_length=255, blank=True, default="")
    evidencia_codigo = models.CharField(max_length=500, blank=True, default="")
    fecha_inicio_estimada = models.DateField(null=True, blank=True)
    fecha_fin_estimada = models.DateField(null=True, blank=True)
    duracion_dias = models.IntegerField(null=True, blank=True)
    orden = models.IntegerField(default=0)
    is_blocked = models.BooleanField(default=False)
    is_manually_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sprint__orden", "orden"]
        verbose_name = "Tarea"
        verbose_name_plural = "Tareas"

    def __str__(self):
        return f"{self.codigo} — {self.titulo[:60]}"

    @property
    def area_color(self):
        return self.area.color if self.area else "#6b7280"

    @property
    def acceptance_progress(self) -> float:
        """% of acceptance criteria checked."""
        if not self.criterios_aceptacion:
            return 0.0
        total = len(self.criterios_aceptacion)
        done = sum(1 for c in self.criterios_aceptacion if c.get("done"))
        return round(done / total * 100, 1)

    def check_blocked(self) -> bool:
        """Recalculate blocked status from dependencies."""
        if self.is_manually_blocked:
            return True
        unresolved = self.dependencias.exclude(status=self.Status.DONE)
        if unresolved.exists():
            names = ", ".join(unresolved.values_list("codigo", flat=True))
            self.is_blocked = True
            self.blocked_reason = f"Dependencias pendientes: {names}"
            return True
        self.is_blocked = False
        self.blocked_reason = ""
        return False


class Evento(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(
        Proyecto, on_delete=models.CASCADE, related_name="eventos"
    )
    sprint = models.ForeignKey(
        Sprint, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="eventos",
    )
    tarea = models.ForeignKey(
        Tarea, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="eventos",
    )
    titulo = models.CharField(max_length=255)
    meet_link = models.URLField()
    fecha = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha"]
