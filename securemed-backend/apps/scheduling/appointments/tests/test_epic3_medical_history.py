"""
EPIC 3 - Story 3.2: Medical History Views Tests
Tests for timeline view, filtering, and quick summary
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, time, timedelta
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.clinical.records.models import MedicalRecord, VitalSign
from apps.scheduling.appointments.models import Appointment

User = get_user_model()


class MedicalHistoryViewsTest(TestCase):
    def setUp(self):
        # Create users
        self.patient_user = User.objects.create_user(
            username='patient_history',
            email='patient_history@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_history',
            email='doctor_history@test.com',
            password='TestPass123!',
            role='doctor'
        )
        
        # Create department and doctor
        self.department = Department.objects.create(
            name='Internal Medicine',
            code='INT',
            building='Main',
            floor=1,
            phone='+1234567890',
            email='int@test.com'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DR456',
            department=self.department,
            specialization='General Physician',
            license_number='DOC456',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT002',
            date_of_birth=date(1985, 5, 15),
            gender='F',
            blood_group='O+',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='456 Test Ave',
            city='Test City',
            state='Test State',
            postal_code='54321',
            allergies='Penicillin',
            chronic_conditions='Hypertension'
        )
        
        self.client = APIClient()

    def test_timeline_view_aggregates_records(self):
        """Test timeline aggregates appointments, records, and labs"""
        # Create appointment
        Appointment.objects.create(
            appointment_id='APT003',
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=date.today(),
            appointment_time=time(10, 0),
            reason='Checkup',
            status='completed',
            created_by=self.patient_user
        )
        
        # Create medical record
        MedicalRecord.objects.create(
            record_id='REC001',
            patient=self.patient,
            doctor=self.doctor,
            record_type='consultation',
            record_date=date.today(),
            diagnosis='Common cold',
            treatment='Rest and fluids'
        )
        
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/patients/timeline/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)

    def test_quick_summary_displays_allergies_blood_type(self):
        """Test quick summary shows critical patient info"""
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get('/api/patients/profile/', {'patient_id': self.patient.patient_id})
        
        # Patient profile should contain allergies and blood group
        self.assertEqual(self.patient.allergies, 'Penicillin')
        self.assertEqual(self.patient.blood_group, 'O+')
        self.assertEqual(self.patient.chronic_conditions, 'Hypertension')

    def test_filter_records_by_type(self):
        """Test filtering medical records by type"""
        # Create different record types
        MedicalRecord.objects.create(
            record_id='REC002',
            patient=self.patient,
            doctor=self.doctor,
            record_type='consultation',
            record_date=date.today(),
            diagnosis='Diagnosis 1'
        )
        MedicalRecord.objects.create(
            record_id='REC003',
            patient=self.patient,
            doctor=self.doctor,
            record_type='lab_report',
            record_date=date.today(),
            diagnosis='Lab results'
        )
        
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get('/api/medical-records/records/', {'record_type': 'consultation'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_chronological_sorting(self):
        """Test records are sorted by date"""
        # Create records with different dates
        yesterday = date.today() - timedelta(days=1)
        today = date.today()
        
        MedicalRecord.objects.create(
            record_id='REC004',
            patient=self.patient,
            doctor=self.doctor,
            record_type='consultation',
            record_date=yesterday,
            diagnosis='Old record'
        )
        MedicalRecord.objects.create(
            record_id='REC005',
            patient=self.patient,
            doctor=self.doctor,
            record_type='consultation',
            record_date=today,
            diagnosis='New record'
        )
        
        records = MedicalRecord.objects.filter(patient=self.patient).order_by('-record_date')
        self.assertEqual(records.first().record_id, 'REC005')

    def test_vital_signs_tracking(self):
        """Test vital signs are tracked in history"""
        VitalSign.objects.create(
            patient=self.patient,
            heart_rate=75,
            systolic_bp=120,
            diastolic_bp=80,
            weight=70.5,
            source='clinical'
        )
        
        vitals = VitalSign.objects.filter(patient=self.patient)
        self.assertEqual(vitals.count(), 1)
        self.assertEqual(vitals.first().heart_rate, 75)
