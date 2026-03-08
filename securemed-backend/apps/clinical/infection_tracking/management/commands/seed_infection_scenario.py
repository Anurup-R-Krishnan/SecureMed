"""
Management command to seed a realistic infection scenario.

Creates patients, doctors, appointments with room assignments, and
infection reports that trigger cluster detection. Uses the actual ORM
and graph service — no mocks or shortcuts.

Usage:
    docker compose run --rm backend python manage.py seed_infection_scenario
"""
from datetime import date, time, timedelta, datetime
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.utils import timezone

from apps.accounts.users.models import User
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.scheduling.appointments.models import Appointment
from apps.clinical.infection_tracking.models import (
    Room, Equipment, EquipmentUsageLog, InfectionReport, InfectionTrace,
)
from apps.clinical.infection_tracking.graph_service import HospitalGraphService


# Real patient demographics — varied enough for a realistic graph
PATIENTS = [
    {'first': 'Arjun',   'last': 'Sharma',  'dob': '1958-03-14', 'gender': 'M', 'blood': 'B+'},
    {'first': 'Priya',   'last': 'Nair',    'dob': '1972-07-22', 'gender': 'F', 'blood': 'O+'},
    {'first': 'Ravi',    'last': 'Kumar',    'dob': '1965-11-01', 'gender': 'M', 'blood': 'A+'},
    {'first': 'Lakshmi', 'last': 'Iyer',     'dob': '1980-04-18', 'gender': 'F', 'blood': 'AB+'},
    {'first': 'Deepak',  'last': 'Singh',    'dob': '1945-09-30', 'gender': 'M', 'blood': 'O-'},
    {'first': 'Ananya',  'last': 'Reddy',    'dob': '1990-01-12', 'gender': 'F', 'blood': 'A-'},
    {'first': 'Suresh',  'last': 'Patel',    'dob': '1955-06-05', 'gender': 'M', 'blood': 'B-'},
    {'first': 'Meera',   'last': 'Gupta',    'dob': '1978-12-25', 'gender': 'F', 'blood': 'O+'},
    {'first': 'Vikram',  'last': 'Desai',    'dob': '1968-08-09', 'gender': 'M', 'blood': 'A+'},
    {'first': 'Kavitha', 'last': 'Menon',    'dob': '1983-02-14', 'gender': 'F', 'blood': 'B+'},
    {'first': 'Rajesh',  'last': 'Rao',      'dob': '1960-10-20', 'gender': 'M', 'blood': 'AB-'},
    {'first': 'Divya',   'last': 'Joshi',    'dob': '1995-05-07', 'gender': 'F', 'blood': 'O+'},
]

DOCTORS = [
    {'first': 'Sanjay', 'last': 'Mehta',    'spec': 'general',      'dept': 'MED',  'license': 'MCI-10234', 'exp': 18, 'fee': 800},
    {'first': 'Anjali', 'last': 'Chopra',   'spec': 'general',      'dept': 'MED',  'license': 'MCI-10567', 'exp': 12, 'fee': 700},
    {'first': 'Rakesh', 'last': 'Verma',    'spec': 'cardiology',   'dept': 'CARD', 'license': 'MCI-20891', 'exp': 22, 'fee': 1500},
    {'first': 'Smita',  'last': 'Kulkarni', 'spec': 'pediatrics',   'dept': 'PED',  'license': 'MCI-30456', 'exp': 15, 'fee': 900},
    {'first': 'Anil',   'last': 'Saxena',   'spec': 'orthopedics',  'dept': 'ORTH', 'license': 'MCI-40123', 'exp': 20, 'fee': 1200},
    {'first': 'Neha',   'last': 'Bhatt',    'spec': 'neurology',    'dept': 'NEUR', 'license': 'MCI-50789', 'exp': 10, 'fee': 1100},
]

DEPARTMENT_DEFAULTS = {
    'MED': 'General Medicine',
    'CARD': 'Cardiology',
    'PED': 'Pediatrics',
    'ORTH': 'Orthopedics',
    'NEUR': 'Neurology',
}


# Appointment schedule — creates the cross-patient/room/doctor web
# The key overlap: patients 0,1,2 share rooms with doctor 0 within 48hrs
# Then patients 3,4 also visit rooms where 0,1 were seen — indirect chain
def _build_schedule(today):
    """
    Returns a list of (patient_idx, doctor_idx, room_id, days_ago, hour, minute, reason).
    The schedule is designed so that:
      - Patients 0,1,2 share MED-EXAM rooms within a tight window (same doctor)
      - Patient 3 shares a room with patient 0 (different doctor)
      - Patient 4 shares a doctor with patient 1 (different room)
      - Patients 5-11 have scattered appointments for graph density
    """
    return [
        # ---- Core cluster: MRSA outbreak via shared room MED-EXAM-01 ----
        # Patient 0 (Arjun) → MED-EXAM-01 with Dr. Mehta, 10 days ago
        (0,  0,  'MED-EXAM-01', 10, 9,  0,  'Follow-up for chronic cough'),
        # Patient 1 (Priya) → MED-EXAM-01 with Dr. Mehta, 9 days ago (same room, next day)
        (1,  0,  'MED-EXAM-01', 9,  10, 0,  'Chest pain evaluation'),
        # Patient 2 (Ravi) → MED-EXAM-01 with Dr. Mehta, 8 days ago
        (2,  0,  'MED-EXAM-01', 8,  11, 0,  'Persistent fever workup'),

        # ---- Secondary cluster: shared room MED-EXAM-02 ----
        # Patient 0 also visited MED-EXAM-02 with Dr. Chopra, 9 days ago
        (0,  1,  'MED-EXAM-02', 9,  14, 0,  'Second opinion on lab results'),
        # Patient 3 (Lakshmi) → MED-EXAM-02 with Dr. Chopra, 8 days ago
        (3,  1,  'MED-EXAM-02', 8,  15, 0,  'Annual health checkup'),

        # ---- Shared doctor link ----
        # Patient 4 (Deepak) → different room but same Dr. Mehta, 9 days ago
        (4,  0,  'MED-EXAM-03', 9,  16, 0,  'Diabetes management review'),

        # ---- Equipment overlap: ventilator shared between patients ----
        # Patient 0 used ventilator in MED-WARD-01, 10 days ago
        (0,  0,  'MED-WARD-01', 10, 8,  0,  'Post-procedure monitoring'),
        # Patient 5 (Ananya) in same ward, 9 days ago
        (5,  1,  'MED-WARD-01', 9,  9,  0,  'Post-operative recovery'),

        # ---- Scatter for realistic graph density ----
        (6,  2,  'CARD-EXAM-01', 12, 10, 0,  'Cardiac stress test'),
        (7,  2,  'CARD-EXAM-02', 11, 11, 0,  'ECG follow-up'),
        (8,  3,  'PED-EXAM-01',  7,  9,  30, 'Child vaccination checkup'),
        (9,  4,  'ORTH-EXAM-01', 6,  14, 0,  'Knee pain assessment'),
        (10, 5,  'NEUR-EXAM-01', 5,  10, 30, 'Migraine consultation'),
        (11, 5,  'NEUR-EXAM-02', 4,  11, 0,  'EEG scheduling'),

        # More appointments to thicken the graph
        (1,  2,  'CARD-EXAM-01', 7,  15, 0,  'Cardiology referral follow-up'),
        (3,  4,  'ORTH-EXAM-02', 5,  10, 0,  'Joint pain assessment'),
        (6,  0,  'MED-EXAM-04', 3,  9,  0,  'General checkup'),
        (7,  1,  'MED-EXAM-05', 2,  11, 0,  'Blood pressure monitoring'),
    ]


# Infection reports — patients diagnosed with MRSA within days of each other
INFECTION_REPORTS = [
    # Patient 0: index case, diagnosed 6 days ago
    {'patient_idx': 0, 'days_ago': 6, 'infection': 'MRSA', 'code': 'A49.02',
     'category': 'hai', 'severity': 'severe', 'specimen': 'wound swab',
     'resistance': ['Methicillin', 'Oxacillin', 'Penicillin']},
    # Patient 1: secondary case, diagnosed 5 days ago
    {'patient_idx': 1, 'days_ago': 5, 'infection': 'MRSA', 'code': 'A49.02',
     'category': 'hai', 'severity': 'moderate', 'specimen': 'blood culture',
     'resistance': ['Methicillin', 'Oxacillin']},
    # Patient 2: tertiary case, diagnosed 4 days ago
    {'patient_idx': 2, 'days_ago': 4, 'infection': 'MRSA', 'code': 'A49.02',
     'category': 'hai', 'severity': 'moderate', 'specimen': 'nasal swab',
     'resistance': ['Methicillin']},
    # Patient 3: separate but linked via room overlap with Patient 0
    {'patient_idx': 3, 'days_ago': 3, 'infection': 'MRSA', 'code': 'A49.02',
     'category': 'hai', 'severity': 'mild', 'specimen': 'wound swab',
     'resistance': ['Methicillin', 'Oxacillin']},
]


class Command(BaseCommand):
    help = 'Seed a realistic infection scenario with patients, doctors, appointments, and infection reports.'

    def _ensure_hospital_prerequisites(self):
        """
        Ensure departments/rooms/equipment required by this scenario exist.
        If not, bootstrap them via setup_hospital.
        """
        required_departments = {d['dept'] for d in DOCTORS}
        required_rooms = {room_id for _, _, room_id, *_ in _build_schedule(date.today())}
        required_rooms.add('MED-WARD-01')

        missing_dept = Department.objects.filter(code__in=required_departments).count() != len(required_departments)
        missing_room = Room.objects.filter(room_id__in=required_rooms).count() != len(required_rooms)
        missing_vent = not Equipment.objects.filter(equipment_type='ventilator').exists()

        if missing_dept or missing_room or missing_vent:
            self.stdout.write(
                self.style.WARNING(
                    'Hospital prerequisites missing (departments/rooms/equipment). '
                    'Running setup_hospital automatically...'
                )
            )
            call_command('setup_hospital')

        # Ensure required doctor departments exist by code, regardless of
        # existing department records that may have mismatched codes.
        for code, name in DEPARTMENT_DEFAULTS.items():
            dept = Department.objects.filter(code=code).first()
            if dept:
                continue

            dept_by_name = Department.objects.filter(name=name).first()
            if dept_by_name:
                # Reconcile legacy/mismatched codes if target code is free.
                if not Department.objects.filter(code=code).exists():
                    dept_by_name.code = code
                    dept_by_name.save(update_fields=['code'])
                continue

            Department.objects.create(
                code=code,
                name=name,
                floor=2,
                building='Main Building',
                phone='0000000000',
                email=f'{code.lower()}@securemed.hospital',
                description=f'Auto-created for infection scenario ({name})',
            )

    @transaction.atomic
    def handle(self, *args, **options):
        graph = HospitalGraphService.get_instance()
        today = date.today()
        self._ensure_hospital_prerequisites()

        # --- 1. Create patients ---
        self.stdout.write('Creating patients...')
        patients = []
        for i, p in enumerate(PATIENTS):
            user, _ = User.objects.get_or_create(
                email=f"{p['first'].lower()}.{p['last'].lower()}@patient.securemed.in",
                defaults={
                    'username': f"{p['first'].lower()}_{p['last'].lower()}",
                    'first_name': p['first'],
                    'last_name': p['last'],
                    'role': 'patient',
                    'is_active': True,
                },
            )
            user.set_password('SecureMed@2026')
            user.save(update_fields=['password'])

            patient, _ = Patient.objects.get_or_create(
                user=user,
                defaults={
                    'patient_id': f'PT-{1001 + i}',
                    'date_of_birth': date.fromisoformat(p['dob']),
                    'gender': p['gender'],
                    'blood_group': p['blood'],
                    'phone': f'+9198765{43210 + i}',
                    'emergency_contact': f'+9198765{43220 + i}',
                    'address': f'{100 + i} Hospital Road',
                    'city': 'Bengaluru',
                    'state': 'Karnataka',
                    'postal_code': '560001',
                },
            )
            patients.append(patient)
            # Sync patient to Neo4j
            graph.sync_patient(patient)

        self.stdout.write(f'  {len(patients)} patients ready.')

        # --- 2. Create doctors ---
        self.stdout.write('Creating doctors...')
        doctors = []
        for i, d in enumerate(DOCTORS):
            user, _ = User.objects.get_or_create(
                email=f"dr.{d['first'].lower()}.{d['last'].lower()}@securemed.in",
                defaults={
                    'username': f"dr_{d['first'].lower()}_{d['last'].lower()}",
                    'first_name': d['first'],
                    'last_name': d['last'],
                    'role': 'doctor',
                    'is_active': True,
                },
            )
            user.set_password('SecureMed@2026')
            user.save(update_fields=['password'])

            dept = Department.objects.get(code=d['dept'])
            doctor, _ = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'doctor_id': f'DR-{2001 + i}',
                    'specialization': d['spec'],
                    'license_number': d['license'],
                    'qualification': 'MBBS, MD',
                    'experience_years': d['exp'],
                    'department': dept,
                    'consultation_fee': d['fee'],
                    'phone': f'+9199887{76540 + i}',
                },
            )
            doctors.append(doctor)
            # Sync doctor to Neo4j
            graph.sync_doctor(doctor)

        self.stdout.write(f'  {len(doctors)} doctors ready.')

        # --- 3. Create appointments with room assignments ---
        self.stdout.write('Creating appointments...')
        schedule = _build_schedule(today)
        appointments = []
        for idx, (p_i, d_i, room_id, days_ago, hour, minute, reason) in enumerate(schedule):
            appt_date = today - timedelta(days=days_ago)
            appt_time = time(hour, minute)
            room = Room.objects.get(room_id=room_id)
            patient = patients[p_i]
            doctor = doctors[d_i]

            appt, created = Appointment.objects.get_or_create(
                doctor=doctor,
                appointment_date=appt_date,
                appointment_time=appt_time,
                defaults={
                    'appointment_id': f'APT-{3001 + idx}',
                    'patient': patient,
                    'room': room,
                    'duration': 30,
                    'status': 'completed',
                    'reason': reason,
                    'created_by': doctor.user,
                },
            )
            if created:
                appointments.append(appt)
                # Sync to Neo4j directly (skip Celery for immediate results)
                graph.sync_appointment(appt)

        self.stdout.write(f'  {len(appointments)} appointments created and synced to graph.')

        # --- 4. Create equipment usage (shared ventilator) ---
        self.stdout.write('Creating equipment usage logs...')
        vent = Equipment.objects.filter(equipment_type='ventilator').first()
        if vent:
            for p_i, days_ago in [(0, 10), (5, 9)]:
                usage_log, created = EquipmentUsageLog.objects.get_or_create(
                    equipment=vent,
                    patient=patients[p_i],
                    started_at=timezone.make_aware(
                        datetime.combine(today - timedelta(days=days_ago), time(8, 0))
                    ),
                    defaults={
                        'room': Room.objects.get(room_id='MED-WARD-01'),
                        'used_by': doctors[0].user,
                        'ended_at': timezone.make_aware(
                            datetime.combine(today - timedelta(days=days_ago), time(12, 0))
                        ),
                        'sterilized_after': days_ago == 10,
                        'notes': 'Ventilator used during recovery',
                    },
                )
                if created:
                    graph.sync_equipment_usage(usage_log)
            self.stdout.write('  Equipment usage logged.')
        else:
            self.stdout.write(self.style.WARNING('  No ventilator found — skipping equipment usage.'))

        # --- 5. Create infection reports and detect clusters ---
        self.stdout.write('Filing infection reports and running cluster detection...')
        reports = []
        for i, ir in enumerate(INFECTION_REPORTS):
            patient = patients[ir['patient_idx']]
            diagnosed_at = timezone.make_aware(
                datetime.combine(today - timedelta(days=ir['days_ago']), time(14, 0))
            )
            report, created = InfectionReport.objects.get_or_create(
                patient=patient,
                infection_name=ir['infection'],
                diagnosed_at=diagnosed_at,
                defaults={
                    'report_id': f'IR-{4001 + i}',
                    'infection_code': ir['code'],
                    'category': ir['category'],
                    'severity': ir['severity'],
                    'specimen_source': ir['specimen'],
                    'antibiotic_resistance': ir['resistance'],
                    'reported_by': doctors[0].user,
                    'notes': f"Patient {patient.patient_id} diagnosed with {ir['infection']}.",
                },
            )
            if created:
                reports.append(report)

        self.stdout.write(f'  {len(reports)} infection reports filed.')

        # Run cluster detection synchronously for each report
        self.stdout.write('Running cluster detection...')
        traces_created = 0
        for report in reports:
            # Find other reports with the same infection within 14 days
            related = InfectionReport.objects.filter(
                infection_name=report.infection_name,
            ).exclude(pk=report.pk)

            for other_report in related:
                # Skip if trace already exists
                if InfectionTrace.objects.filter(
                    source_report=report, target_report=other_report
                ).exists() or InfectionTrace.objects.filter(
                    source_report=other_report, target_report=report
                ).exists():
                    continue

                # Run pathfinding
                path = graph.find_transmission_path(
                    report.patient.patient_id,
                    other_report.patient.patient_id,
                    start_date=today - timedelta(days=30),
                    end_date=today,
                )
                if path:
                    # Compute hours between diagnoses for confidence scoring
                    hours_between = abs(
                        (report.diagnosed_at - other_report.diagnosed_at).total_seconds() / 3600
                    )
                    trace = InfectionTrace.objects.create(
                        trace_id=f'TR-{5001 + traces_created}',
                        source_report=report,
                        target_report=other_report,
                        infection_name=report.infection_name,
                        transmission_path=path,
                        path_length=path['length'],
                        confidence_score=HospitalGraphService.compute_confidence(path, hours_between),
                        vector_type=HospitalGraphService.determine_vector_type(path),
                        status='detected',
                    )
                    traces_created += 1
                    self.stdout.write(
                        f'  TRACE {trace.trace_id}: '
                        f'{report.patient.patient_id} → {other_report.patient.patient_id} '
                        f'({trace.vector_type}, confidence={trace.confidence_score:.2f})'
                    )

        self.stdout.write(self.style.SUCCESS(
            f'\nScenario seeded: '
            f'{len(patients)} patients, {len(doctors)} doctors, '
            f'{len(appointments)} appointments, {len(reports)} infection reports, '
            f'{traces_created} transmission traces detected.'
        ))
