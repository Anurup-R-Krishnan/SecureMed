"""
Celery tasks for infection tracking.

Tasks:
- sync_appointment_to_graph: sync a single appointment to Neo4j
- sync_equipment_usage_to_graph: sync equipment usage to Neo4j
- detect_infection_cluster: triggered on infection report creation
- rebuild_graph: nightly full resync
- compute_room_risk_scores: periodic risk score snapshots
"""
import logging
from datetime import timedelta
from uuid import uuid4

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


def _generate_trace_id():
    """Generate a collision-resistant trace ID."""
    return f"TRC-{uuid4().hex[:12].upper()}"


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def sync_appointment_to_graph(self, appointment_id):
    """Sync a completed appointment into the Neo4j graph."""
    from apps.clinical.infection_tracking.graph_service import HospitalGraphService
    from apps.scheduling.appointments.models import Appointment

    try:
        appointment = (
            Appointment.objects
            .select_related(
                'patient', 'patient__user',
                'doctor', 'doctor__user', 'doctor__department',
                'room', 'room__department',
            )
            .get(id=appointment_id)
        )
        graph = HospitalGraphService.get_instance()
        graph.sync_patient(appointment.patient)
        graph.sync_doctor(appointment.doctor)
        if appointment.room:
            graph.sync_room(appointment.room)
        graph.sync_appointment(appointment)
        logger.info("Synced appointment %s to graph.", appointment.appointment_id)
    except Appointment.DoesNotExist:
        logger.error("Appointment %d does not exist.", appointment_id)
    except Exception as exc:
        logger.exception("Failed to sync appointment %d to graph.", appointment_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def sync_equipment_usage_to_graph(self, usage_log_id):
    """Sync an equipment usage event into the Neo4j graph."""
    from apps.clinical.infection_tracking.graph_service import HospitalGraphService
    from apps.clinical.infection_tracking.models import EquipmentUsageLog

    try:
        usage = (
            EquipmentUsageLog.objects
            .select_related(
                'equipment', 'equipment__current_room',
                'patient', 'patient__user', 'room',
            )
            .get(id=usage_log_id)
        )
        graph = HospitalGraphService.get_instance()
        graph.sync_equipment(usage.equipment)
        graph.sync_patient(usage.patient)
        graph.sync_equipment_usage(usage)
        logger.info("Synced equipment usage %d to graph.", usage_log_id)
    except EquipmentUsageLog.DoesNotExist:
        logger.error("EquipmentUsageLog %d does not exist.", usage_log_id)
    except Exception as exc:
        logger.exception("Failed to sync equipment usage %d to graph.", usage_log_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def detect_infection_cluster(self, report_id):
    """
    Triggered when an InfectionReport is created. Checks for other patients
    diagnosed with the same infection within 48 hours, and runs shortestPath
    in Neo4j to find transmission vectors.
    """
    from apps.clinical.infection_tracking.graph_service import HospitalGraphService
    from apps.clinical.infection_tracking.models import InfectionReport, InfectionTrace

    try:
        report = (
            InfectionReport.objects
            .select_related('patient')
            .get(id=report_id)
        )
    except InfectionReport.DoesNotExist:
        logger.error("InfectionReport %d does not exist.", report_id)
        return

    # Find other patients with same infection within 48 hours
    time_window = timedelta(hours=48)
    window_start = report.diagnosed_at - time_window
    window_end = report.diagnosed_at + time_window

    related_reports = (
        InfectionReport.objects
        .select_related('patient')
        .filter(
            infection_name__iexact=report.infection_name,
            diagnosed_at__range=(window_start, window_end),
        )
        .exclude(id=report.id)
    )

    if not related_reports.exists():
        logger.info(
            "No cluster found for report %s (%s).",
            report.report_id, report.infection_name,
        )
        return

    graph = HospitalGraphService.get_instance()
    traces_created = 0

    for related in related_reports:
        # Skip if trace already exists for this pair
        existing = InfectionTrace.objects.filter(
            source_report__in=[report, related],
            target_report__in=[report, related],
        ).exists()
        if existing:
            continue

        # Determine source/target by diagnosis time order
        if report.diagnosed_at <= related.diagnosed_at:
            source, target = report, related
        else:
            source, target = related, report

        # Search for path in the graph
        search_start = (min(source.diagnosed_at, target.diagnosed_at) - timedelta(days=14)).date()
        search_end = max(source.diagnosed_at, target.diagnosed_at).date()

        path_data = graph.find_transmission_path(
            source.patient.patient_id,
            target.patient.patient_id,
            start_date=search_start,
            end_date=search_end,
        )

        if path_data is None:
            # No path found — still record it as unknown vector
            path_data = {
                'path': [],
                'length': 0,
            }

        hours_between = abs(
            (source.diagnosed_at - target.diagnosed_at).total_seconds() / 3600
        )
        vector_type = graph.determine_vector_type(path_data) if path_data['path'] else 'unknown'
        confidence = graph.compute_confidence(path_data, hours_between) if path_data['path'] else 0.0

        # Generate trace ID (collision-resistant under concurrency)
        trace_id = _generate_trace_id()
        while InfectionTrace.objects.filter(trace_id=trace_id).exists():
            trace_id = _generate_trace_id()

        InfectionTrace.objects.create(
            trace_id=trace_id,
            source_report=source,
            target_report=target,
            infection_name=report.infection_name,
            transmission_path=path_data['path'],
            path_length=path_data['length'],
            confidence_score=confidence,
            vector_type=vector_type,
        )
        traces_created += 1

    logger.info(
        "Cluster detection for report %s: %d traces created.",
        report.report_id, traces_created,
    )


@shared_task(bind=True, max_retries=1, default_retry_delay=300)
def rebuild_graph(self):
    """Full graph rebuild from PostgreSQL. Scheduled nightly via Celery Beat."""
    from apps.clinical.infection_tracking.graph_service import HospitalGraphService

    try:
        graph = HospitalGraphService.get_instance()
        graph.full_rebuild()
        logger.info("Full graph rebuild completed.")
    except Exception as exc:
        logger.exception("Graph rebuild failed.")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def compute_room_risk_scores(self):
    """
    Compute room risk scores from the graph and store snapshots.
    Scheduled periodically (e.g. every 6 hours) via Celery Beat.
    """
    from apps.clinical.infection_tracking.graph_service import HospitalGraphService
    from apps.clinical.infection_tracking.models import (
        InfectionReport,
        Room,
        RoomRiskScore,
    )

    try:
        graph = HospitalGraphService.get_instance()
        window_days = 7
        window_end = timezone.now()
        window_start = window_end - timedelta(days=window_days)

        high_risk = graph.get_high_risk_rooms(days=window_days, limit=100)

        for room_data in high_risk:
            try:
                room = Room.objects.get(room_id=room_data['room_id'])
            except Room.DoesNotExist:
                continue

            # Count infections linked to this room
            infection_count = (
                InfectionReport.objects
                .filter(
                    patient__appointments__room=room,
                    diagnosed_at__range=(window_start, window_end),
                )
                .distinct()
                .count()
            )

            # Normalize risk_score to 0.0–1.0
            raw_score = room_data.get('risk_score', 0)
            max_expected = 500  # calibration ceiling
            normalized = min(1.0, raw_score / max_expected)

            RoomRiskScore.objects.create(
                room=room,
                score=round(normalized, 4),
                patient_count=room_data.get('patient_count', 0),
                doctor_count=room_data.get('doctor_count', 0),
                infection_count=infection_count,
                window_start=window_start,
                window_end=window_end,
            )

        logger.info("Room risk scores computed: %d rooms scored.", len(high_risk))
    except Exception as exc:
        logger.exception("Room risk score computation failed.")
        raise self.retry(exc=exc)
