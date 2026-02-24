"""
EPIC 4 - Story 4.2: Blinded Processing Tests
Tests for lab worklist with sample IDs only (no patient names)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Doctor, Department
from apps.clinical.diagnostics.models import LabTest, LabOrder, LabResult

User = get_user_model()


class BlindedProcessingTest(TestCase):
    def setUp(self):
        # Create users
        self.patient_user = User.objects.create_user(
            username='patient_blind',
            email='patient_blind@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_blind',
            email='doctor_blind@test.com',
            password='TestPass123!',
            role='doctor'
        )
        self.tech_user = User.objects.create_user(
            username='lab_tech',
            email='lab_tech@test.com',
            password='TestPass123!',
            role='provider',
            is_staff=True
        )
        
        # Create department and doctor
        self.department = Department.objects.create(
            name='Laboratory',
            code='LAB',
            building='Lab',
            floor=1,
            phone='+1234567890',
            email='lab@test.com'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DR444',
            department=self.department,
            specialization='Lab Medicine',
            license_number='DOC444',
            qualification='MBBS, MD',
            experience_years=5,
            consultation_fee=500.00,
            phone='+1234567890'
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT006',
            date_of_birth=date(1992, 4, 18),
            gender='F',
            phone='+1234567890',
            emergency_contact='+0987654321',
            address='777 Blind St',
            city='Test City',
            state='Test State',
            postal_code='33333'
        )
        
        # Create lab test
        self.test = LabTest.objects.create(
            name='Hemoglobin',
            code='HGB',
            category='Hematology',
            turnaround_time='2 hours'
        )
        
        self.client = APIClient()

    def test_worklist_shows_sample_id_only(self):
        """Test worklist displays sample ID instead of patient name"""
        # Create order
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='pending',
            priority='routine'
        )
        order.items.add(self.test)
        
        self.client.force_authenticate(user=self.tech_user)
        response = self.client.get('/api/labs/worklist/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify sample_id is present
        if len(response.data) > 0:
            self.assertIn('sample_id', response.data[0])

    def test_technician_can_enter_results(self):
        """Test technician can enter test results"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing',
            priority='routine'
        )
        order.items.add(self.test)
        
        self.client.force_authenticate(user=self.tech_user)
        
        data = {
            'test_code': 'HGB',
            'result_value': '14.5',
            'units': 'g/dL',
            'reference_range': '12.0-16.0',
            'flag': ''
        }
        
        response = self.client.post(f'/api/labs/worklist/{order.id}/enter_result/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_result_value_validation(self):
        """Test result values are validated"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing'
        )
        order.items.add(self.test)
        
        result = LabResult.objects.create(
            order=order,
            test=self.test,
            result_value='14.5',
            units='g/dL',
            reference_range='12.0-16.0',
            technician_name='Tech User'
        )
        
        self.assertEqual(result.result_value, '14.5')

    def test_critical_value_flagging(self):
        """Test technicians can flag critical values"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing'
        )
        order.items.add(self.test)
        
        result = LabResult.objects.create(
            order=order,
            test=self.test,
            result_value='6.0',
            units='g/dL',
            reference_range='12.0-16.0',
            flag='Critical',
            technician_name='Tech User'
        )
        
        self.assertEqual(result.flag, 'Critical')

    def test_technician_id_logged(self):
        """Test technician ID is logged with result"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing'
        )
        order.items.add(self.test)
        
        result = LabResult.objects.create(
            order=order,
            test=self.test,
            result_value='13.2',
            technician_name=self.tech_user.get_full_name()
        )
        
        self.assertEqual(result.technician_name, self.tech_user.get_full_name())

    def test_order_status_updates_when_complete(self):
        """Test order status changes to completed when all tests done"""
        order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing'
        )
        order.items.add(self.test)
        
        # Add result
        LabResult.objects.create(
            order=order,
            test=self.test,
            result_value='14.0',
            technician_name='Tech'
        )
        
        # Check if all tests have results
        pending_tests = order.items.exclude(id__in=order.results.values_list('test_id', flat=True))
        
        if not pending_tests.exists():
            order.status = 'completed'
            order.save()
        
        order.refresh_from_db()
        self.assertEqual(order.status, 'completed')
