"""
EPIC 3 - Story 3.3: Break-Glass Protocol Tests
Tests for emergency access override functionality
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.clinical.records.models import EmergencyAccessLog

User = get_user_model()


class BreakGlassProtocolTest(TestCase):
    def setUp(self):
        # Create patient
        self.patient_user = User.objects.create_user(
            username='patient_emergency',
            email='patient_emergency@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT003',
            date_of_birth=date(1980, 3, 20),
            gender='M',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='789 Emergency St',
            city='Test City',
            state='Test State',
            postal_code='99999'
        )
        
        # Create doctor without normal access
        self.emergency_doctor_user = User.objects.create_user(
            username='emergency_doctor',
            email='emergency_doctor@test.com',
            password='TestPass123!',
            role='doctor'
        )
        self.department = Department.objects.create(
            name='Emergency',
            code='EME',
            building='ER',
            floor=1,
            phone='+1234567890',
            email='eme@test.com'
        )
        self.emergency_doctor = Doctor.objects.create(
            user=self.emergency_doctor_user,
            doctor_id='DR789',
            department=self.department,
            specialization='Emergency Medicine',
            license_number='DOC789',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        self.client = APIClient()

    def test_emergency_access_requires_justification(self):
        """Test emergency access requires a reason"""
        self.client.force_authenticate(user=self.emergency_doctor_user)
        
        data = {
            'patient_id': self.patient.patient_id,
            'reason': ''  # Empty reason
        }
        
        response = self.client.post('/api/medical-records/records/break_glass/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_emergency_access_creates_log(self):
        """Test emergency access creates audit log"""
        self.client.force_authenticate(user=self.emergency_doctor_user)
        
        data = {
            'patient_id': self.patient.patient_id,
            'reason': 'Patient unconscious, need medical history'
        }
        
        response = self.client.post('/api/medical-records/records/break_glass/', data)
        
        # Check log was created
        log_exists = EmergencyAccessLog.objects.filter(
            patient=self.patient,
            accessed_by=self.emergency_doctor_user
        ).exists()
        
        self.assertTrue(log_exists)

    def test_emergency_access_log_contains_reason(self):
        """Test emergency log stores justification"""
        log = EmergencyAccessLog.objects.create(
            patient=self.patient,
            accessed_by=self.emergency_doctor_user,
            reason='Critical emergency - cardiac arrest',
            ip_address='192.168.1.1'
        )
        
        log.refresh_from_db()
        self.assertEqual(log.reason, 'Critical emergency - cardiac arrest')
        self.assertEqual(log.patient, self.patient)
        self.assertEqual(log.accessed_by, self.emergency_doctor_user)

    def test_emergency_access_timestamp_recorded(self):
        """Test emergency access timestamp is recorded"""
        log = EmergencyAccessLog.objects.create(
            patient=self.patient,
            accessed_by=self.emergency_doctor_user,
            reason='Emergency access needed'
        )
        
        self.assertIsNotNone(log.timestamp)

    def test_multiple_emergency_accesses_tracked(self):
        """Test multiple emergency accesses are all logged"""
        # Create multiple logs
        EmergencyAccessLog.objects.create(
            patient=self.patient,
            accessed_by=self.emergency_doctor_user,
            reason='First emergency'
        )
        EmergencyAccessLog.objects.create(
            patient=self.patient,
            accessed_by=self.emergency_doctor_user,
            reason='Second emergency'
        )
        
        logs = EmergencyAccessLog.objects.filter(patient=self.patient)
        self.assertEqual(logs.count(), 2)

    def test_emergency_access_grants_actual_data_access(self):
        """Test that breaking glass actually allows viewing records of unassigned patient"""
        from apps.clinical.records.models import MedicalRecord
        from django.utils import timezone
        
        # 1. Create a medical record for the patient (doctor is NOT the emergency doctor)
        other_doctor_user = User.objects.create_user('other_doc', 'other@test.com', 'pass')
        other_doctor = Doctor.objects.create(
            user=other_doctor_user, 
            doctor_id='DR_OTHER', 
            department=self.department,
            specialization='General Medicine',
            license_number='DOC_OTHER',
            qualification='MBBS',
            experience_years=5,
            consultation_fee=100.00,
            phone='+1999999999'
        )
        
        record = MedicalRecord.objects.create(
            record_id='REC-EMERGENCY-TEST',
            patient=self.patient,
            doctor=other_doctor,
            record_type='consultation',
            record_date=timezone.now().date(),
            diagnosis='Hidden Condition',
            notes='Confidential notes',
            source='provider'
        )
        
        self.client.force_authenticate(user=self.emergency_doctor_user)
        
        # 2. Try to access record BEFORE breaking glass -> Should be 404 (Not Found in queryset)
        response_before = self.client.get(f'/api/medical-records/records/{record.id}/')
        self.assertEqual(response_before.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Break Glass
        break_glass_data = {
            'patient_id': self.patient.patient_id,
            'reason': 'Emergency Access Required'
        }
        self.client.post('/api/medical-records/records/break_glass/', break_glass_data)
        
        # 4. Try to access record AFTER breaking glass -> Should be 200 OK
        response_after = self.client.get(f'/api/medical-records/records/{record.id}/')
        self.assertEqual(response_after.status_code, status.HTTP_200_OK)
        self.assertEqual(response_after.data['diagnosis'], 'Hidden Condition')
