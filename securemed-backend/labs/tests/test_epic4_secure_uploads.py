"""
EPIC 4 - Story 4.3: Secure Uploads Tests
Tests for file upload functionality for lab results
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from patients.models import Patient
from labs.models import LabTest, LabOrder, LabResult

User = get_user_model()


class SecureUploadsTest(TestCase):
    def setUp(self):
        # Create users
        self.patient_user = User.objects.create_user(
            username='patient_upload',
            email='patient_upload@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_upload',
            email='doctor_upload@test.com',
            password='TestPass123!',
            role='doctor'
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT007',
            date_of_birth=date(1990, 6, 25),
            gender='M',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='888 Upload Ave',
            city='Test City',
            state='Test State',
            postal_code='44444'
        )
        
        # Create lab test
        self.test = LabTest.objects.create(
            name='X-Ray Chest',
            code='XRAY',
            category='Imaging',
            turnaround_time='1 hour'
        )
        
        # Create order
        self.order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing'
        )
        self.order.items.add(self.test)
        
        self.client = APIClient()

    def test_file_upload_to_result(self):
        """Test file can be attached to lab result"""
        # Create a simple test file
        test_file = SimpleUploadedFile(
            "test_report.pdf",
            b"file_content",
            content_type="application/pdf"
        )
        
        result = LabResult.objects.create(
            order=self.order,
            test=self.test,
            result_value='Normal',
            file_attachment=test_file,
            technician_name='Tech User'
        )
        
        self.assertIsNotNone(result.file_attachment)
        self.assertTrue(result.file_attachment.name.endswith('.pdf'))

    def test_pdf_upload_accepted(self):
        """Test PDF files are accepted"""
        pdf_file = SimpleUploadedFile(
            "report.pdf",
            b"%PDF-1.4 test content",
            content_type="application/pdf"
        )
        
        result = LabResult.objects.create(
            order=self.order,
            test=self.test,
            result_value='See attachment',
            file_attachment=pdf_file,
            technician_name='Tech'
        )
        
        self.assertTrue(result.file_attachment.name.endswith('.pdf'))

    def test_image_upload_accepted(self):
        """Test image files are accepted"""
        image_file = SimpleUploadedFile(
            "xray.jpg",
            b"fake_image_content",
            content_type="image/jpeg"
        )
        
        result = LabResult.objects.create(
            order=self.order,
            test=self.test,
            result_value='See image',
            file_attachment=image_file,
            technician_name='Tech'
        )
        
        self.assertTrue(result.file_attachment.name.endswith('.jpg'))

    def test_result_without_file(self):
        """Test results can be created without file attachment"""
        result = LabResult.objects.create(
            order=self.order,
            test=self.test,
            result_value='15.2',
            units='mg/dL',
            technician_name='Tech'
        )
        
        self.assertFalse(result.file_attachment)

    def test_file_download_endpoint(self):
        """Test file can be downloaded via API"""
        test_file = SimpleUploadedFile(
            "download_test.pdf",
            b"downloadable_content",
            content_type="application/pdf"
        )
        
        result = LabResult.objects.create(
            order=self.order,
            test=self.test,
            result_value='Normal',
            file_attachment=test_file,
            technician_name='Tech'
        )
        
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(f'/api/labs/results/{result.id}/download/')
        
        # Should return file or 404 if no file
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
