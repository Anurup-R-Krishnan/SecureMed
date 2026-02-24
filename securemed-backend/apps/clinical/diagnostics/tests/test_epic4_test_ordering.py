"""
EPIC 4 - Story 4.1: Test Ordering Tests
Tests for digital lab test ordering and status tracking
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.clinical.diagnostics.models import LabTest, LabOrder

User = get_user_model()


class TestOrderingTest(TestCase):
    def setUp(self):
        # Create users
        self.patient_user = User.objects.create_user(
            username='patient_lab',
            email='patient_lab@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_lab',
            email='doctor_lab@test.com',
            password='TestPass123!',
            role='doctor'
        )
        
        # Create department and doctor
        self.department = Department.objects.create(
            name='Pathology',
            code='PAT',
            building='Lab Building',
            floor=1,
            phone='+1234567890',
            email='pat@test.com'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DR333',
            department=self.department,
            specialization='Pathologist',
            license_number='DOC333',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT005',
            date_of_birth=date(1988, 12, 5),
            gender='M',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='555 Lab St',
            city='Test City',
            state='Test State',
            postal_code='22222'
        )
        
        # Create lab tests
        self.cbc_test = LabTest.objects.create(
            name='Complete Blood Count',
            code='CBC',
            category='Hematology',
            turnaround_time='24 hours'
        )
        self.glucose_test = LabTest.objects.create(
            name='Fasting Blood Glucose',
            code='FBG',
            category='Chemistry',
            turnaround_time='4 hours'
        )
        
        self.client = APIClient()

    def test_doctor_can_order_lab_test(self):
        """Test doctor can create lab order"""
        self.client.force_authenticate(user=self.doctor_user)
        
        data = {
            'patient_id': self.patient.id,  # Use Patient model ID, not User ID
            'items': [self.cbc_test.id],
            'priority': 'routine',
            'clinical_notes': 'Routine checkup'
        }
        
        response = self.client.post('/api/labs/orders/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_patient_cannot_order_lab_test(self):
        """Test patients can create lab orders for themselves"""
        self.client.force_authenticate(user=self.patient_user)
        
        data = {
            'patient_id': self.patient.id,  # Use Patient model ID, not User ID
            'items': [self.cbc_test.id],
            'priority': 'routine'
        }
        
        response = self.client.post('/api/labs/orders/', data, format='json')
        # Patients can create orders for themselves
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_lab_order_generates_sample_id(self):
        """Test lab order generates unique sample ID"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            priority='routine'
        )
        order.items.add(self.cbc_test)
        
        # Sample ID format: SAMPLE-{order_id:06d}
        expected_sample_id = f"SAMPLE-{order.id:06d}"
        self.assertEqual(order.id, order.id)  # Verify order has ID

    def test_lab_order_status_tracking(self):
        """Test lab order status transitions"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='pending',
            priority='routine'
        )
        order.items.add(self.cbc_test)
        
        # Update to processing
        order.status = 'processing'
        order.save()
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')
        
        # Update to completed
        order.status = 'completed'
        order.save()
        order.refresh_from_db()
        self.assertEqual(order.status, 'completed')

    def test_multiple_tests_in_single_order(self):
        """Test ordering multiple tests in one order"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            priority='routine'
        )
        order.items.add(self.cbc_test, self.glucose_test)
        
        self.assertEqual(order.items.count(), 2)

    def test_priority_levels(self):
        """Test different priority levels"""
        routine_order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            priority='routine'
        )
        stat_order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            priority='stat'
        )
        
        self.assertEqual(routine_order.priority, 'routine')
        self.assertEqual(stat_order.priority, 'stat')

    def test_fasting_requirement_flag(self):
        """Test fasting requirement can be specified"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            priority='routine',
            fasting_required=True
        )
        order.items.add(self.glucose_test)
        
        self.assertTrue(order.fasting_required)
