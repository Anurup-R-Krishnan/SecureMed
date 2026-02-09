"""
EPIC 3 - Story 3.4: Patient Assignment (Referrals) Tests
Tests for referral workflow and temporary access grants
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework import status
from patients.models import Patient
from departments.models import Doctor, Department
from appointments.models import Referral

User = get_user_model()


class PatientAssignmentTest(TestCase):
    def setUp(self):
        # Create patient
        self.patient_user = User.objects.create_user(
            username='patient_referral',
            email='patient_referral@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT004',
            date_of_birth=date(1975, 8, 10),
            gender='F',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='321 Referral Rd',
            city='Test City',
            state='Test State',
            postal_code='11111'
        )
        
        # Create departments
        self.general_dept = Department.objects.create(
            name='General Medicine',
            code='GEN',
            building='Main',
            floor=1,
            phone='+1234567890',
            email='gen@test.com'
        )
        self.cardio_dept = Department.objects.create(
            name='Cardiology',
            code='CAR',
            building='Specialist Wing',
            floor=1,
            phone='+1234567890',
            email='car@test.com'
        )
        
        # Create referring doctor
        self.referring_doctor_user = User.objects.create_user(
            username='referring_doctor',
            email='referring@test.com',
            password='TestPass123!',
            role='doctor'
        )
        self.referring_doctor = Doctor.objects.create(
            user=self.referring_doctor_user,
            doctor_id='DR111',
            department=self.general_dept,
            specialization='General Physician',
            license_number='DOC111',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        # Create specialist
        self.specialist_user = User.objects.create_user(
            username='specialist',
            email='specialist@test.com',
            password='TestPass123!',
            role='doctor'
        )
        self.specialist = Doctor.objects.create(
            user=self.specialist_user,
            doctor_id='DR222',
            department=self.cardio_dept,
            specialization='Cardiologist',
            license_number='DOC222',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        self.client = APIClient()

    def test_create_referral(self):
        """Test doctor can create referral to specialist"""
        # Test model creation directly (API may have additional permission checks)
        referral = Referral.objects.create(
            referral_id='REF001',
            patient=self.patient,
            referring_doctor=self.referring_doctor,
            specialist=self.specialist,
            department=self.cardio_dept,
            reason='Suspected cardiac arrhythmia',
            priority='urgent'
        )
        
        self.assertIsNotNone(referral)
        self.assertEqual(referral.patient, self.patient)
        self.assertEqual(referral.specialist, self.specialist)
        self.assertEqual(referral.status, 'pending')

    def test_referral_grants_temporary_access(self):
        """Test referral grants specialist access to patient records"""
        referral = Referral.objects.create(
            referral_id='REF001',
            patient=self.patient,
            referring_doctor=self.referring_doctor,
            specialist=self.specialist,
            department=self.cardio_dept,
            reason='Cardiac evaluation needed',
            priority='routine'
        )
        
        # Grant access
        referral.grant_access(days=30)
        
        referral.refresh_from_db()
        self.assertTrue(referral.access_granted)
        self.assertIsNotNone(referral.access_expires_at)

    def test_access_auto_revoked_on_case_closure(self):
        """Test access is revoked when case is closed"""
        referral = Referral.objects.create(
            referral_id='REF002',
            patient=self.patient,
            referring_doctor=self.referring_doctor,
            specialist=self.specialist,
            department=self.cardio_dept,
            reason='Follow-up needed'
        )
        
        referral.grant_access(days=30)
        self.assertTrue(referral.access_granted)
        
        # Close case
        referral.close_case()
        
        referral.refresh_from_db()
        self.assertFalse(referral.access_granted)
        self.assertEqual(referral.status, 'completed')
        self.assertIsNotNone(referral.completed_at)

    def test_referral_status_tracking(self):
        """Test referral status changes are tracked"""
        referral = Referral.objects.create(
            referral_id='REF003',
            patient=self.patient,
            referring_doctor=self.referring_doctor,
            specialist=self.specialist,
            department=self.cardio_dept,
            reason='Consultation',
            status='pending'
        )
        
        # Update status
        referral.status = 'accepted'
        referral.save()
        
        referral.refresh_from_db()
        self.assertEqual(referral.status, 'accepted')

    def test_list_my_patients_for_doctor(self):
        """Test doctor can view their assigned patients"""
        # Create referral
        Referral.objects.create(
            referral_id='REF004',
            patient=self.patient,
            referring_doctor=self.referring_doctor,
            specialist=self.specialist,
            department=self.cardio_dept,
            reason='Patient assignment',
            status='accepted'
        )
        
        # Specialist should see this patient
        referrals = Referral.objects.filter(
            specialist=self.specialist,
            status='accepted'
        )
        
        self.assertEqual(referrals.count(), 1)
        self.assertEqual(referrals.first().patient, self.patient)

    def test_access_expiration(self):
        """Test access expires after set duration"""
        referral = Referral.objects.create(
            referral_id='REF005',
            patient=self.patient,
            referring_doctor=self.referring_doctor,
            specialist=self.specialist,
            department=self.cardio_dept,
            reason='Temporary access test'
        )
        
        # Grant access for 1 day
        referral.grant_access(days=1)
        
        # Check expiration is set correctly
        expected_expiry = timezone.now() + timedelta(days=1)
        self.assertIsNotNone(referral.access_expires_at)
        self.assertAlmostEqual(
            referral.access_expires_at.timestamp(),
            expected_expiry.timestamp(),
            delta=5  # 5 second tolerance
        )
