"""
EPIC 5 - Story 5.1: E-Prescribing Tests
Tests for digital prescription signing and locking
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.clinical.records.models import MedicalRecord, Prescription

User = get_user_model()


class EPrescribingTest(TestCase):
    def setUp(self):
        # Create users
        self.patient_user = User.objects.create_user(
            username='patient_rx',
            email='patient_rx@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_rx',
            email='doctor_rx@test.com',
            password='TestPass123!',
            role='doctor'
        )
        
        # Create department and doctor
        self.department = Department.objects.create(
            name='Family Medicine',
            code='FAM',
            building='Clinic',
            floor=1,
            phone='+1234567890',
            email='fam@test.com'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DR555',
            department=self.department,
            specialization='Family Physician',
            license_number='DOC555',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT008',
            date_of_birth=date(1985, 9, 12),
            gender='F',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='999 Rx Lane',
            city='Test City',
            state='Test State',
            postal_code='55555'
        )
        
        # Create medical record
        self.record = MedicalRecord.objects.create(
            record_id='REC006',
            patient=self.patient,
            doctor=self.doctor,
            record_type='consultation',
            record_date=date.today(),
            diagnosis='Hypertension'
        )
        
        self.client = APIClient()

    def test_create_prescription(self):
        """Test doctor can create prescription"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Lisinopril',
            dosage='10mg',
            frequency='Once daily',
            duration='30 days',
            instructions='Take in the morning'
        )
        
        self.assertEqual(prescription.medication_name, 'Lisinopril')
        self.assertEqual(prescription.status, 'draft')

    def test_prescription_requires_dosage_frequency_duration(self):
        """Test prescription has required fields"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Metformin',
            dosage='500mg',
            frequency='Twice daily',
            duration='90 days'
        )
        
        self.assertIsNotNone(prescription.dosage)
        self.assertIsNotNone(prescription.frequency)
        self.assertIsNotNone(prescription.duration)

    def test_digital_signature(self):
        """Test prescription can be digitally signed"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Amoxicillin',
            dosage='500mg',
            frequency='Three times daily',
            duration='7 days'
        )
        
        # Sign prescription
        prescription.sign(self.doctor_user)
        
        prescription.refresh_from_db()
        self.assertTrue(prescription.is_signed)
        self.assertIsNotNone(prescription.signed_at)
        self.assertEqual(prescription.signed_by, self.doctor_user)
        self.assertEqual(prescription.status, 'signed')

    def test_signature_hash_generated(self):
        """Test signature hash is generated on signing"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Aspirin',
            dosage='81mg',
            frequency='Once daily',
            duration='Ongoing'
        )
        
        prescription.sign(self.doctor_user)
        
        prescription.refresh_from_db()
        self.assertIsNotNone(prescription.signature_hash)
        self.assertEqual(len(prescription.signature_hash), 64)  # SHA-256 hex length

    def test_signed_prescription_is_locked(self):
        """Test signed prescriptions cannot be modified"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Ibuprofen',
            dosage='400mg',
            frequency='As needed',
            duration='30 days'
        )
        
        prescription.sign(self.doctor_user)
        
        self.assertTrue(prescription.is_locked())

    def test_cannot_sign_already_signed_prescription(self):
        """Test cannot sign prescription twice"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Acetaminophen',
            dosage='500mg',
            frequency='Every 6 hours',
            duration='5 days'
        )
        
        prescription.sign(self.doctor_user)
        
        # Try to sign again
        with self.assertRaises(ValueError):
            prescription.sign(self.doctor_user)

    def test_prescription_status_transitions(self):
        """Test prescription status changes"""
        prescription = Prescription.objects.create(
            medical_record=self.record,
            medication_name='Omeprazole',
            dosage='20mg',
            frequency='Once daily',
            duration='30 days',
            status='draft'
        )
        
        # Sign it
        prescription.sign(self.doctor_user)
        self.assertEqual(prescription.status, 'signed')
        
        # Mark as dispensed
        prescription.status = 'dispensed'
        prescription.save()
        prescription.refresh_from_db()
        self.assertEqual(prescription.status, 'dispensed')

    def test_multiple_prescriptions_per_record(self):
        """Test multiple prescriptions can be attached to one record"""
        Prescription.objects.create(
            medical_record=self.record,
            medication_name='Med A',
            dosage='10mg',
            frequency='Once daily',
            duration='30 days'
        )
        Prescription.objects.create(
            medical_record=self.record,
            medication_name='Med B',
            dosage='20mg',
            frequency='Twice daily',
            duration='30 days'
        )
        
        prescriptions = Prescription.objects.filter(medical_record=self.record)
        self.assertEqual(prescriptions.count(), 2)
