"""
Management command to seed sample doctors for testing.
Run with: python manage.py seed_doctors
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from departments.models import Doctor, Department

User = get_user_model()

SAMPLE_DOCTORS = [
    {'first_name': 'Sarah', 'last_name': 'Johnson', 'specialty': 'cardiology', 'email': 'dr.johnson@securemed.com', 'years': 15},
    {'first_name': 'Michael', 'last_name': 'Chen', 'specialty': 'neurology', 'email': 'dr.chen@securemed.com', 'years': 12},
    {'first_name': 'Emily', 'last_name': 'Williams', 'specialty': 'pediatrics', 'email': 'dr.williams@securemed.com', 'years': 8},
    {'first_name': 'David', 'last_name': 'Brown', 'specialty': 'orthopedics', 'email': 'dr.brown@securemed.com', 'years': 20},
    {'first_name': 'Lisa', 'last_name': 'Davis', 'specialty': 'dermatology', 'email': 'dr.davis@securemed.com', 'years': 10},
]


class Command(BaseCommand):
    help = 'Seeds the database with sample doctors for testing'

    def handle(self, *args, **options):
        created_count = 0
        
        for i, doc_data in enumerate(SAMPLE_DOCTORS, 1):
            username = doc_data['email'].split('@')[0]
            
            # Check if user already exists
            user, user_created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': doc_data['email'],
                    'first_name': doc_data['first_name'],
                    'last_name': doc_data['last_name'],
                    'role': 'doctor',
                    'is_active': True,
                }
            )
            
            if user_created:
                user.set_password('DoctorPass123!')
                user.save()
            
            # Create doctor profile
            doctor_id = f"DOC-{i:05d}"
            
            doctor, doc_created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'doctor_id': doctor_id,
                    'specialization': doc_data['specialty'],
                    'license_number': f"LIC-{i:05d}",
                    'qualification': 'MD, MBBS',
                    'experience_years': doc_data['years'],
                    'consultation_fee': 150.00,
                    'phone': f'+1-555-{100+i:03d}-{1000+i:04d}',
                    'is_active': True,
                    'is_available': True,
                }
            )
            
            if doc_created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Created: Dr. {doc_data['first_name']} {doc_data['last_name']} ({doc_data['specialty']})"
                ))
            else:
                self.stdout.write(f"Exists: {doc_data['email']}")
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal doctors created: {created_count}"))
