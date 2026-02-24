"""
Create test users and data for workflow testing
"""
import os
import sys
import django

sys.path.append('/home/anuruprkris/Project/SecureMed/securemed-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor
from apps.clinical.diagnostics.models import LabTest
from apps.clinical.pharmacy.models import Drug, DrugStock
from decimal import Decimal

User = get_user_model()

def create_test_data():
    print("Creating test users and data...")
    
    # 1. Create Patient
    try:
        patient_user = User.objects.get(email='test_patient@test.com')
        print(f"✓ Patient user exists: {patient_user.email}")
    except User.DoesNotExist:
        patient_user = User.objects.create_user(
            username='test_patient',
            email='test_patient@test.com',
            password='SecureMed@123',
            role='patient',
            first_name='John',
            last_name='Doe'
        )
        print(f"✓ Created patient user: {patient_user.email}")
    
    try:
        patient = Patient.objects.get(user=patient_user)
        print(f"✓ Patient profile exists: {patient.patient_id}")
    except Patient.DoesNotExist:
        patient = Patient.objects.create(
            user=patient_user,
            patient_id=f'P-TEST-{patient_user.id:04d}',
            date_of_birth='1990-01-01',
            gender='M',
            blood_group='O+',
            phone='+1234567890',
            emergency_contact='+1234567890',
            address='123 Test St'
        )
        print(f"✓ Created patient profile: {patient.patient_id}")
    
    # 2. Create Doctor
    try:
        doctor_user = User.objects.get(email='test_doctor@test.com')
        print(f"✓ Doctor user exists: {doctor_user.email}")
    except User.DoesNotExist:
        doctor_user = User.objects.create_user(
            username='test_doctor',
            email='test_doctor@test.com',
            password='SecureMed@123',
            role='doctor',
            first_name='Jane',
            last_name='Smith'
        )
        print(f"✓ Created doctor user: {doctor_user.email}")
    
    try:
        doctor = Doctor.objects.get(user=doctor_user)
        print(f"✓ Doctor profile exists: {doctor.doctor_id}")
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(
            user=doctor_user,
            doctor_id=f'DOC-{doctor_user.id:04d}',
            specialization='general',
            license_number=f'LIC-{doctor_user.id:06d}',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=Decimal('1000.00'),
            phone='+1234567890'
        )
        print(f"✓ Created doctor profile: {doctor.doctor_id}")
    
    # 3. Create Lab Tech
    try:
        lab_tech = User.objects.get(email='test_labtech@test.com')
        print(f"✓ Lab tech exists: {lab_tech.email}")
    except User.DoesNotExist:
        lab_tech = User.objects.create_user(
            username='test_labtech',
            email='test_labtech@test.com',
            password='SecureMed@123',
            role='lab_technician',
            first_name='Mike',
            last_name='Tech'
        )
        print(f"✓ Created lab tech: {lab_tech.email}")
    
    # 4. Create Pharmacist
    try:
        pharmacist = User.objects.get(email='test_pharmacist@test.com')
        print(f"✓ Pharmacist exists: {pharmacist.email}")
    except User.DoesNotExist:
        pharmacist = User.objects.create_user(
            username='test_pharmacist',
            email='test_pharmacist@test.com',
            password='SecureMed@123',
            role='pharmacist',
            first_name='Sarah',
            last_name='Pharm'
        )
        print(f"✓ Created pharmacist: {pharmacist.email}")
    
    # 5. Create Lab Tests
    lab_tests = [
        ('CBC', 'Complete Blood Count', 'Hematology'),
        ('BG', 'Blood Glucose', 'Chemistry'),
        ('LFT', 'Liver Function Test', 'Chemistry'),
    ]
    
    for code, name, category in lab_tests:
        test, created = LabTest.objects.get_or_create(
            code=code,
            defaults={
                'name': name,
                'category': category,
                'description': f'{name} test',
                'turnaround_time': '24 hours'
            }
        )
        if created:
            print(f"✓ Created lab test: {code}")
        else:
            print(f"✓ Lab test exists: {code}")
    
    # 6. Create Drugs
    drugs = [
        ('MED-001', 'Amoxicillin', 'Tablet', '500mg', '10.00'),
        ('MED-002', 'Paracetamol', 'Tablet', '650mg', '5.00'),
        ('MED-003', 'Ibuprofen', 'Tablet', '400mg', '8.00'),
    ]
    
    for code, name, form, strength, price in drugs:
        drug, created = Drug.objects.get_or_create(
            drug_code=code,
            defaults={
                'name': name,
                'generic_name': name,
                'manufacturer': 'PharmaCo',
                'dosage_form': form,
                'strength': strength,
                'unit_price': Decimal(price)
            }
        )
        if created:
            print(f"✓ Created drug: {code}")
            # Create stock
            DrugStock.objects.create(drug=drug, quantity=1000)
        else:
            print(f"✓ Drug exists: {code}")
    
    print("\n========================================")
    print("Test data setup complete!")
    print("========================================")
    print(f"\nTest Credentials:")
    print(f"  Patient: test_patient@test.com / SecureMed@123")
    print(f"  Doctor: test_doctor@test.com / SecureMed@123")
    print(f"  Lab Tech: test_labtech@test.com / SecureMed@123")
    print(f"  Pharmacist: test_pharmacist@test.com / SecureMed@123")
    print()

if __name__ == '__main__':
    create_test_data()
