"""
Django signals for infection tracking.

Automatically syncs data to the Neo4j graph and triggers cluster detection
when relevant models are saved.
"""
import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


GRAPH_SYNC_STATUSES = {'completed', 'in_progress'}
GRAPH_SYNC_FIELDS = (
    'patient_id',
    'doctor_id',
    'room_id',
    'appointment_date',
    'appointment_time',
    'duration',
)


@receiver(pre_save, sender='appointments.Appointment', dispatch_uid='infection_tracking_capture_prev_status')
def capture_previous_appointment_status(sender, instance, **kwargs):
    """Capture previous appointment status to gate graph sync enqueueing."""
    if not instance.pk:
        instance._previous_status = None
        instance._previous_sync_snapshot = None
        return

    previous_row = (
        sender.objects
        .filter(pk=instance.pk)
        .values('status', *GRAPH_SYNC_FIELDS)
        .first()
    )
    if previous_row is None:
        instance._previous_status = None
        instance._previous_sync_snapshot = None
        return

    instance._previous_status = previous_row.get('status')
    instance._previous_sync_snapshot = {
        field: previous_row.get(field)
        for field in GRAPH_SYNC_FIELDS
    }


@receiver(post_save, sender='appointments.Appointment', dispatch_uid='infection_tracking_sync_appointment_graph')
def on_appointment_saved(sender, instance, created, **kwargs):
    """Queue graph sync only on create or transition into sync statuses."""
    from apps.clinical.infection_tracking.tasks import sync_appointment_to_graph

    if created:
        if instance.status not in GRAPH_SYNC_STATUSES:
            return
        sync_appointment_to_graph.delay(instance.id)
        return

    if instance.status not in GRAPH_SYNC_STATUSES:
        return

    previous_status = getattr(instance, '_previous_status', None)
    if previous_status not in GRAPH_SYNC_STATUSES:
        sync_appointment_to_graph.delay(instance.id)
        return

    previous_snapshot = getattr(instance, '_previous_sync_snapshot', None)
    if previous_snapshot is None:
        # If we cannot prove unchanged graph-affecting fields, sync defensively.
        sync_appointment_to_graph.delay(instance.id)
        return

    current_snapshot = {
        field: getattr(instance, field, None)
        for field in GRAPH_SYNC_FIELDS
    }

    if current_snapshot == previous_snapshot:
        return

    sync_appointment_to_graph.delay(instance.id)


@receiver(post_save, sender='infection_tracking.InfectionReport', dispatch_uid='infection_tracking_detect_cluster')
def on_infection_report_created(sender, instance, created, **kwargs):
    """Trigger cluster detection when a new infection is reported."""
    if created:
        from apps.clinical.infection_tracking.tasks import detect_infection_cluster
        detect_infection_cluster.delay(instance.id)


@receiver(post_save, sender='infection_tracking.EquipmentUsageLog', dispatch_uid='infection_tracking_sync_equipment_usage')
def on_equipment_usage_logged(sender, instance, created, **kwargs):
    """Sync new equipment usage events to the graph."""
    if created:
        from apps.clinical.infection_tracking.tasks import sync_equipment_usage_to_graph
        sync_equipment_usage_to_graph.delay(instance.id)
