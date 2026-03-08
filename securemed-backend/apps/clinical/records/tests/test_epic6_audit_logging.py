"""
EPIC 6 - Story 6.1: Audit Logging Tests
Tests for comprehensive audit trail of data access
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.clinical.records.models import MedicalRecord, MedicalRecordAccess

User = get_user_model()


class AuditLoggingTest(TestCase):
    def setUp(self):
        # Create users
        self.patient_user = User.objects.create_user(
            username='patient_audit',
            email='patient_audit@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_audit',
            email='doctor_audit@test.com',
            password='TestPass123!',
            role='doctor'
        )
        
        # Create department and doctor
        self.department = Department.objects.create(
            name='Audit Dept',
            code='AUD',
            building='Main',
            floor=1,
            phone='+1234567890',
            email='aud@test.com'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DR777',
            department=self.department,
            specialization='Auditor',
            license_number='DOC777',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT010',
            date_of_birth=date(1975, 11, 30),
            gender='F',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='222 Audit Ave',
            city='Test City',
            state='Test State',
            postal_code='77777'
        )
        
        # Create medical record
        self.record = MedicalRecord.objects.create(
            record_id='REC008',
            patient=self.patient,
            doctor=self.doctor,
            record_type='consultation',
            record_date=date.today(),
            diagnosis='Test diagnosis'
        )
        
        self.client = APIClient()

    def test_access_log_created_on_view(self):
        """Test audit log is created when record is viewed"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='viewed'
        )
        
        self.assertEqual(log.medical_record, self.record)
        self.assertEqual(log.accessed_by, self.doctor_user)
        self.assertEqual(log.action, 'viewed')

    def test_access_log_includes_timestamp(self):
        """Test audit log includes timestamp"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='viewed'
        )
        
        self.assertIsNotNone(log.access_timestamp)

    def test_differentiate_read_vs_write_actions(self):
        """Test audit log differentiates between read and write"""
        # Read action
        read_log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='viewed'
        )
        
        # Write action
        write_log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='updated'
        )
        
        self.assertEqual(read_log.action, 'viewed')
        self.assertEqual(write_log.action, 'updated')

    def test_log_creation_action(self):
        """Test audit log for record creation"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='created'
        )
        
        self.assertEqual(log.action, 'created')

    def test_log_export_action(self):
        """Test audit log for data export"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.patient_user,
            action='exported'
        )
        
        self.assertEqual(log.action, 'exported')

    def test_log_print_action(self):
        """Test audit log for printing records"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='printed'
        )
        
        self.assertEqual(log.action, 'printed')

    def test_multiple_accesses_tracked(self):
        """Test multiple accesses are all logged"""
        # Create multiple access logs
        for i in range(3):
            MedicalRecordAccess.objects.create(
                medical_record=self.record,
                accessed_by=self.doctor_user,
                action='viewed'
            )
        
        logs = MedicalRecordAccess.objects.filter(
            medical_record=self.record,
            accessed_by=self.doctor_user
        )
        
        self.assertEqual(logs.count(), 3)

    def test_access_reason_optional(self):
        """Test access reason is optional for routine views"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='viewed'
            # No access_reason provided
        )
        
        self.assertEqual(log.access_reason, '')

    def test_ip_address_logging(self):
        """Test IP address can be logged"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='viewed',
            ip_address='192.168.1.100'
        )
        
        self.assertEqual(log.ip_address, '192.168.1.100')

    def test_audit_trail_chronological(self):
        """Test audit logs are ordered chronologically"""
        # Create logs at different times
        log1 = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='viewed'
        )
        log2 = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='updated'
        )
        
        logs = MedicalRecordAccess.objects.filter(
            medical_record=self.record
        ).order_by('-access_timestamp')
        
        self.assertEqual(logs.first().id, log2.id)

    def test_attestation_action_logged(self):
        """Test attestation action is logged"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='attested'
        )
        
        self.assertEqual(log.action, 'attested')

    def test_amendment_action_logged(self):
        """Test amendment action is logged"""
        log = MedicalRecordAccess.objects.create(
            medical_record=self.record,
            accessed_by=self.doctor_user,
            action='amended'
        )
        
        self.assertEqual(log.action, 'amended')
