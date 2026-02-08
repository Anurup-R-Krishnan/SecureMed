import os
import django
import sys
from django.conf import settings

# Setup Django environment
sys.path.append('/home/anuruprkris/Project/SecureMed/securemed-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from patients.models import Patient
from medical_records.models import VitalSign

User = get_user_model()

def check_and_fix_patient():
    print("Checking patient1...")
    try:
        user = User.objects.get(email='patient1@gmail.com')
        print(f"User found: {user.email} (ID: {user.id})")
        
        if hasattr(user, 'patient_profile'):
            print(f"Patient profile exists: {user.patient_profile.patient_id}")
            patient = user.patient_profile
        else:
            print("Patient profile MISSING! Creating one...")
            from datetime import date
            patient = Patient.objects.create(
                user=user,
                patient_id="P-PATIENT1",
                date_of_birth=date(1990, 1, 1),
                gender="M",
                blood_group="O+",
                phone="+1234567890",
                emergency_contact="+1987654321",
                address="123 Main St",
                city="Tech City",
                state="State",
                postal_code="12345",
                country="India"
            )
            print(f"Created patient profile: {patient.patient_id}")

        # Check Vitals
        vitals_count = VitalSign.objects.filter(patient=patient).count()
        print(f"Vital Signs count: {vitals_count}")
        
        if vitals_count == 0:
            print("No vitals found. Seeding vitals...")
            # Seed 7 days of vitals
            from datetime import timedelta, datetime
            import random
            from django.utils import timezone
            
            now = timezone.now()
            for i in range(7):
                date_recorded = now - timedelta(days=6-i)
                VitalSign.objects.create(
                    patient=patient,
                    recorded_by=user, # Self-recorded
                    heart_rate=random.randint(60, 100),
                    systolic_bp=random.randint(110, 130),
                    diastolic_bp=random.randint(70, 85),
                    respiratory_rate=random.randint(12, 18),
                    temperature=random.uniform(97.5, 99.0),
                    oxygen_saturation=random.randint(95, 100),
                    weight=random.uniform(65.0, 75.0) + (i * 0.1),
                    notes="Daily check",
                    created_at=date_recorded # Note: auto_now_add might override this on save, need to update after
                )
            print("Seeded 7 days of vitals.")

    except User.DoesNotExist:
        print("User patient1@gmail.com does not exist!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_and_fix_patient()
