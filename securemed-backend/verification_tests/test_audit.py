from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from medical_records.models import MedicalRecord, MedicalRecordAccess
from patients.models import Patient
from appointments.models import Doctor
from django.urls import reverse

class AuditLoggingTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.doctor_user = User.objects.create_user(username='dr_audit', email='dr_audit@example.com', password='password', role='doctor')
        self.patient_user = User.objects.create_user(username='patient_audit', email='patient_audit@example.com', password='password', role='patient')
        
        Doctor.objects.create(
            user=self.doctor_user, 
            specialization='General Practice',
            experience_years=10,
            consultation_fee=100.0
        )
        Patient.objects.create(
            user=self.patient_user, 
            patient_id='P-AUDIT',
            date_of_birth='1990-01-01',
            gender='M',
            phone='+1234567890',
            emergency_contact='+1987654321',
            address="123 Main St",
            city="Anytown",
            state="CA",
            postal_code="12345",
            country="USA"
        )
        
        self.record = MedicalRecord.objects.create(
            patient=self.patient_user.patient_profile,
            doctor=self.doctor_user.doctor_profile,
            diagnosis="Audit Test",
            record_type="consultation",
            record_date='2026-02-09'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.doctor_user)

    def test_audit_retrieve_log(self):
        # Test Retrieve Log
        url = f"/api/medical-records/records/{self.record.id}/"
        
        response = self.client.get(url)
             
        self.assertEqual(response.status_code, 200)
        
        # Verify Audit Log
        logs = MedicalRecordAccess.objects.filter(medical_record=self.record, action='viewed')
        self.assertTrue(logs.exists())
        self.assertEqual(logs.first().accessed_by, self.doctor_user)
    
    def test_audit_update_log(self):
        url = f"/api/medical-records/records/{self.record.id}/"
        
        data = {
            'diagnosis': 'Updated Diagnosis'
        }
        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, 200)
        
        logs = MedicalRecordAccess.objects.filter(medical_record=self.record, action='updated')
        self.assertTrue(logs.exists())
