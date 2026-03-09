from datetime import timedelta

from django.core.management import BaseCommand, call_command
from django.utils import timezone

from apps.clinical.infection_tracking.graph_service import HospitalGraphService
from apps.clinical.infection_tracking.models import InfectionTrace, Room
from apps.clinical.records.models import EmergencyAccessLog
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor
from apps.scheduling.appointments.models import Appointment


class Command(BaseCommand):
    help = "Ensure the infection tracking demo graph is populated when missing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-run rebuild and demo seeding even if graph data already exists.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        graph = HospitalGraphService.get_instance()
        stats = graph.get_graph_stats()
        patient_nodes = int(stats.get("nodes", {}).get("Patient", 0) or 0)
        doctor_nodes = int(stats.get("nodes", {}).get("Doctor", 0) or 0)
        room_nodes = int(stats.get("nodes", {}).get("Room", 0) or 0)
        trace_count = InfectionTrace.objects.count()
        completed_appointments = Appointment.objects.filter(
            status__in=["completed", "in_progress"]
        ).count()

        has_graph_data = patient_nodes > 0 and doctor_nodes > 0 and room_nodes > 0
        has_trace_data = trace_count > 0

        self._ensure_emergency_demo_activity()

        if has_graph_data and has_trace_data and not force:
            self.stdout.write(
                self.style.SUCCESS(
                    "Infection tracking demo data already present; skipping."
                )
            )
            return

        self.stdout.write("Ensuring infection tracking graph prerequisites...")
        if not Room.objects.exists():
            call_command("setup_hospital")

        self.stdout.write("Rebuilding infection graph from relational data...")
        graph.full_rebuild()
        stats = graph.get_graph_stats()
        patient_nodes = int(stats.get("nodes", {}).get("Patient", 0) or 0)
        doctor_nodes = int(stats.get("nodes", {}).get("Doctor", 0) or 0)
        room_nodes = int(stats.get("nodes", {}).get("Room", 0) or 0)
        trace_count = InfectionTrace.objects.count()

        has_graph_data = patient_nodes > 0 and doctor_nodes > 0 and room_nodes > 0
        has_trace_data = trace_count > 0

        if not has_graph_data or not has_trace_data or completed_appointments == 0:
            self.stdout.write(
                "Graph still sparse for demo use; seeding infection scenario..."
            )
            call_command("seed_infection_scenario")
            stats = graph.get_graph_stats()
            patient_nodes = int(stats.get("nodes", {}).get("Patient", 0) or 0)
            doctor_nodes = int(stats.get("nodes", {}).get("Doctor", 0) or 0)
            room_nodes = int(stats.get("nodes", {}).get("Room", 0) or 0)
            trace_count = InfectionTrace.objects.count()

        self.stdout.write(
            self.style.SUCCESS(
                "Infection tracking ready: "
                f"{patient_nodes} patients, {doctor_nodes} doctors, "
                f"{room_nodes} rooms, {trace_count} traces."
            )
        )

    def _ensure_emergency_demo_activity(self):
        now = timezone.now()
        recent_cutoff = now - timedelta(days=7)

        has_emergency_appointments = Appointment.objects.filter(
            appointment_date__gte=recent_cutoff.date(),
            reason__icontains="emergency",
        ).exists()
        has_break_glass = EmergencyAccessLog.objects.filter(
            timestamp__gte=recent_cutoff,
        ).exists()

        if has_emergency_appointments and has_break_glass:
            return

        emergency_room = (
            Room.objects.filter(room_type="emergency", is_active=True).order_by("room_id").first()
        )
        doctor = (
            Doctor.objects.select_related("user")
            .filter(is_active=True)
            .order_by("id")
            .first()
        )
        patient = (
            Patient.objects.select_related("user")
            .order_by("id")
            .first()
        )
        if not emergency_room or not doctor or not patient:
            return

        if not has_emergency_appointments:
            appointment_time = (now - timedelta(hours=2)).time().replace(second=0, microsecond=0)
            appointment, created = Appointment.objects.get_or_create(
                appointment_id="APT-ER-0001",
                defaults={
                    "patient": patient,
                    "doctor": doctor,
                    "appointment_date": now.date(),
                    "appointment_time": appointment_time,
                    "duration": 45,
                    "status": "in_progress",
                    "reason": "Emergency respiratory distress triage",
                    "notes": "Walk-in emergency case routed through ER intake.",
                    "created_by": doctor.user,
                    "room": emergency_room,
                },
            )
            if created:
                HospitalGraphService.get_instance().sync_patient(patient)
                HospitalGraphService.get_instance().sync_doctor(doctor)
                HospitalGraphService.get_instance().sync_appointment(appointment)
                self.stdout.write("Seeded emergency appointment activity.")

        if not has_break_glass:
            EmergencyAccessLog.objects.get_or_create(
                patient=patient,
                accessed_by=doctor.user,
                reason="Emergency trauma intake required immediate chart access.",
                emergency_type="life_threatening",
            )
            self.stdout.write("Seeded emergency break-glass activity.")
