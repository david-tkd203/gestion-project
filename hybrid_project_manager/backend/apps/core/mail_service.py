"""
Servicio central de correo para VINCULO.
Usa las plantillas MJML compiladas + Django templates para enviar emails con diseño.
"""
from dataclasses import dataclass
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


@dataclass
class EmailContext:
    base_url: str = ""
    project: str = "VINCULO"
    # Se agregan dinámicamente según la plantilla


def _send_template(template_name: str, subject: str, to: list[str], context: dict) -> int:
    """
    Renderiza una plantilla MJML compilada y envía el correo.

    Args:
        template_name: nombre del archivo .html en templates/emails/html/
        subject: asunto del correo
        to: lista de destinatarios
        context: variables para la plantilla

    Returns:
        1 si se envió, 0 si falló
    """
    context.setdefault("base_url", "https://vinculosync.tech")

    html = render_to_string(f"emails/html/{template_name}.html", context)
    text = strip_tags(html)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to,
    )
    msg.attach_alternative(html, "text/html")
    return msg.send(fail_silently=False)


# ─── APIs públicas ───


def send_welcome(to: str, name: str, email: str) -> int:
    return _send_template("welcome", "Bienvenido a VINCULO", [to], {
        "name": name, "email": email,
    })


def send_task_assigned(to: str, task_name: str, task_description: str, task_id: int,
                       project: str, assigned_by: str, priority: str,
                       priority_label: str, priority_bg: str, priority_text: str,
                       sprint: str, status: str) -> int:
    return _send_template("task_assigned", f"[{project}] Nueva tarea: {task_name}", [to], {
        "task_name": task_name, "task_description": task_description, "task_id": task_id,
        "project": project, "assigned_to": to, "assigned_by": assigned_by,
        "priority": priority, "priority_label": priority_label,
        "priority_bg": priority_bg, "priority_text": priority_text,
        "sprint": sprint, "status": status,
    })


def send_task_completed(to: list[str], task_name: str, task_id: int,
                        completed_by: str, project: str, sprint: str,
                        task_description: str) -> int:
    return _send_template("task_completed", f"✓ [{project}] Tarea completada: {task_name}", to, {
        "task_name": task_name, "task_id": task_id, "completed_by": completed_by,
        "project": project, "sprint": sprint, "task_description": task_description,
    })


def send_sprint_started(to: list[str], sprint_name: str, project: str,
                        sprint_id: int, task_count: int, member_count: int,
                        sprint_duration: int, sprint_goal: str) -> int:
    return _send_template("sprint_started",
                          f"[{project}] Sprint {sprint_name} ha comenzado", to, {
        "sprint_name": sprint_name, "project": project, "sprint_id": sprint_id,
        "task_count": task_count, "member_count": member_count,
        "sprint_duration": sprint_duration, "sprint_goal": sprint_goal,
    })


def send_sprint_reminder(to: list[str], sprint_name: str, project: str,
                         sprint_id: int, days_left: int, pending_tasks: int,
                         completed_tasks: int, completion_pct: int,
                         pending_list: str) -> int:
    return _send_template("sprint_reminder",
                          f"⏰ [{project}] Sprint {sprint_name} termina en {days_left} días", to, {
        "sprint_name": sprint_name, "project": project, "sprint_id": sprint_id,
        "days_left": days_left, "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks, "completion_pct": completion_pct,
        "pending_list": pending_list,
    })


def send_comment(to: list[str], task_name: str, task_id: int,
                 commenter: str, comment_body: str, timestamp: str,
                 project: str) -> int:
    return _send_template("comment_added",
                          f"[{project}] {commenter} comentó en {task_name}", to, {
        "task_name": task_name, "task_id": task_id, "commenter": commenter,
        "comment_body": comment_body, "timestamp": timestamp,
        "project": project,
    })


def send_password_reset(to: str, reset_url: str) -> int:
    return _send_template("password_reset", "Restablece tu contraseña de VINCULO", [to], {
        "reset_url": reset_url,
    })


def send_daily_digest(to: list[str], project: str, date: str,
                      completed_today: int, in_progress: int, pending: int,
                      activity_list: str) -> int:
    return _send_template("daily_digest",
                          f"📋 [{project}] Resumen diario — {date}", to, {
        "project": project, "date": date, "completed_today": completed_today,
        "in_progress": in_progress, "pending": pending,
        "activity_list": activity_list,
    })


def send_github_alerts(to: list[str], repo: str, alert_count: int,
                       alert_list: str) -> int:
    return _send_template("github_alert",
                          f"🔒 {alert_count} alerta(s) de seguridad en {repo}", to, {
        "repo": repo, "alert_count": alert_count, "alert_list": alert_list,
    })
