"""
Signal handlers for automatic dependency checks and real-time broadcasts.
"""
import logging
from django.db.models.signals import pre_save, post_save, m2m_changed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Tarea

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Tarea)
def auto_check_blocked(sender, instance, **kwargs):
    """
    Before saving a task, re-check blocked status.
    Also, if marking as DONE, verify all dependencies are DONE first.
    """
    if instance.pk is None:
        return  # New task, skip

    try:
        old = Tarea.objects.get(pk=instance.pk)
    except Tarea.DoesNotExist:
        return

    # If moving to DONE, verify dependencies
    if instance.status == Tarea.Status.DONE and old.status != Tarea.Status.DONE:
        unresolved = instance.dependencias.exclude(status=Tarea.Status.DONE)
        if unresolved.exists():
            names = ", ".join(unresolved.values_list("codigo", flat=True))
            instance.is_blocked = True
            instance.blocked_reason = f"Cannot complete: dependencies pending ({names})"
            logger.warning(
                "Blocked %s from DONE — deps: %s", instance.codigo, names
            )


@receiver(m2m_changed, sender=Tarea.dependencias.through)
def on_dependencies_changed(sender, instance, action, **kwargs):
    """Re-check blocked status when dependencies are modified."""
    if action in ("post_add", "post_remove", "post_clear"):
        instance.check_blocked()
        instance.save(update_fields=["is_blocked", "blocked_reason"])
        # Also update reverse: tasks that depend on THIS task
        for dependent in Tarea.objects.filter(dependencias=instance):
            dependent.check_blocked()
            dependent.save(update_fields=["is_blocked", "blocked_reason"])


@receiver(post_save, sender=Tarea)
def broadcast_task_update(sender, instance, created, **kwargs):
    """
    After a task save, send a Kanban update.
    Uses Channels layer — actual send happens in the view/consumer layer.
    This signal ensures data consistency hooks exist.
    """
    if created:
        logger.info("Tarea created: %s", instance.codigo)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    from .models import UserProfile

    UserProfile.objects.get_or_create(user=instance, defaults={"role": "lector"})
