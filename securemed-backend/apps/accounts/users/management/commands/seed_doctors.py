"""
Management command to seed dummy doctors for testing.

Usage:
    python manage.py seed_doctors
    python manage.py seed_doctors --clear  # delete existing seeded doctors first
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()

PASSWORD = "SecurePass123!@#"

# (first, last, email, specialization, dept_name, license, qualification, exp_years, fee)
DOCTORS = [
    ("Sarah",  "Smith",   "dr.sarah.smith@securemed.com",   "cardiology",   "Cardiology",     "MCI-SM-001", "MBBS, MD Cardiology",     14, 1200),
    ("James",  "Wilson",  "dr.james.wilson@securemed.com",  "neurology",    "Neurology",      "MCI-JW-002", "MBBS, DM Neurology",      11,  900),
    ("Priya",  "Patel",   "dr.priya.patel@securemed.com",   "dermatology",  "Dermatology",    "MCI-PP-003", "MBBS, MD Dermatology",     8,  750),
    ("Robert", "Chen",    "dr.robert.chen@securemed.com",   "general",      "General Medicine","MCI-RC-004", "MBBS, MD General Medicine", 6,  500),
    ("Aisha",  "Nair",    "dr.aisha.nair@securemed.com",    "pediatrics",   "Pediatrics",     "MCI-AN-005", "MBBS, DCH Pediatrics",    10,  800),
]


class Command(BaseCommand):
    help = "Seed 5 dummy doctors for development/testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete previously seeded doctors before re-creating them.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.scheduling.availability.models import Department, Doctor

        if options["clear"]:
            emails = [d[2] for d in DOCTORS]
            deleted, _ = User.objects.filter(email__in=emails).delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} existing seeded users."))

        created_count = 0

        for i, (first, last, email, spec, dept_name, license_no, qual, exp, fee) in enumerate(DOCTORS, start=1):
            # --- Department (get or create) ---
            dept, _ = Department.objects.get_or_create(
                name=dept_name,
                defaults={
                    "code": dept_name[:5].upper().replace(" ", ""),
                    "floor": 1,
                    "building": "Main Hospital",
                    "phone": f"+91-8000000{i:03d}",
                    "email": f"{dept_name.lower().replace(' ', '.')}@securemed.com",
                },
            )

            # --- User (get or create) ---
            username = email.split("@")[0]
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": username,
                    "first_name": first,
                    "last_name": last,
                    "role": "doctor",
                    "is_active": True,
                },
            )
            if user_created:
                user.set_password(PASSWORD)
                user.save()

            # --- Doctor profile (get or create) ---
            doctor_id = f"DOC-SEED-{i:04d}"
            doctor, doc_created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "doctor_id": doctor_id,
                    "specialization": spec,
                    "department": dept,
                    "license_number": license_no,
                    "qualification": qual,
                    "experience_years": exp,
                    "consultation_fee": fee,
                    "phone": f"+91-9000000{i:03d}",
                    "is_available": True,
                    "is_active": True,
                },
            )

            status_label = "created" if doc_created else "already exists"
            self.stdout.write(
                self.style.SUCCESS(f"  [{status_label}]  Dr. {first} {last}  —  {spec}  (login: {email})")
            )
            if doc_created:
                created_count += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Done. {created_count} new doctor(s) seeded."))
        self.stdout.write(f"Password for all seeded doctors: {PASSWORD}")
