"""
Django signals for infection tracking.

Automatically syncs data to the Neo4j graph and triggers cluster detection
when relevant models are saved.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='appointments.Appointment')
def on_appointment_saved(sender, instance, **kwargs):
    """Sync completed/in-progress appointments to the graph."""
    if instance.status in ('completed', 'in_progress'):
        from apps.clinical.infection_tracking.tasks import sync_appointment_to_graph
        sync_appointment_to_graph.delay(instance.id)


@receiver(post_save, sender='infection_tracking.InfectionReport')
def on_infection_report_created(sender, instance, created, **kwargs):
    """Trigger cluster detection when a new infection is reported."""
    if created:
        from apps.clinical.infection_tracking.tasks import detect_infection_cluster
        detect_infection_cluster.delay(instance.id)


@receiver(post_save, sender='infection_tracking.EquipmentUsageLog')
def on_equipment_usage_logged(sender, instance, created, **kwargs):
    """Sync new equipment usage events to the graph."""
    if created:
        from apps.clinical.infection_tracking.tasks import sync_equipment_usage_to_graph
        sync_equipment_usage_to_graph.delay(instance.id)
