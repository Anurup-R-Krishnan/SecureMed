"""
Management command to create Patient profiles for existing users with 'patient' role
who don't have a Patient profile yet.

Usage:
    python manage.py fix_missing_patient_profiles
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from patients.models import Patient
import uuid


User = get_user_model()


class Command(BaseCommand):
    help = 'Create Patient profiles for patient-role users who are missing them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find all users with patient role who don't have a patient_profile
        patient_users = User.objects.filter(role='patient')
        
        created_count = 0
        skipped_count = 0
        
        for user in patient_users:
            if hasattr(user, 'patient_profile'):
                self.stdout.write(f"  SKIP: {user.email} - already has profile")
                skipped_count += 1
                continue
            
            patient_id = f"PT-{uuid.uuid4().hex[:8].upper()}"
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(f"  WOULD CREATE: {user.email} -> {patient_id}")
                )
            else:
                Patient.objects.create(
                    user=user,
                    patient_id=patient_id,
                    date_of_birth='1990-01-01',
                    gender='O',
                    phone='+0000000000',
                    emergency_contact='+0000000000',
                    address='Not provided',
                    city='Not provided',
                    state='Not provided',
                    postal_code='000000',
                )
                self.stdout.write(
                    self.style.SUCCESS(f"  CREATED: {user.email} -> {patient_id}")
                )
            
            created_count += 1
        
        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run: Would create {created_count} profiles"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Created {created_count} patient profiles"))
        self.stdout.write(f"Skipped {skipped_count} users (already have profiles)")
