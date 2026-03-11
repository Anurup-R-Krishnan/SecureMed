"""
EPIC 4 - Story 4.3: Release Flow Tests
Validate lab tech entry -> doctor release -> patient visibility.
"""
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.patients.models import Patient
from apps.clinical.diagnostics.models import LabTest, LabOrder, LabResult

User = get_user_model()


class LabResultReleaseFlowTest(TestCase):
    def setUp(self):
        self.patient_user = User.objects.create_user(
            username='patient_release',
            email='patient_release@test.com',
            password='TestPass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor_release',
            email='doctor_release@test.com',
            password='TestPass123!',
            role='doctor'
        )
        self.tech_user = User.objects.create_user(
            username='lab_tech_release',
            email='lab_tech_release@test.com',
            password='TestPass123!',
            role='lab_technician'
        )

        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='PAT-REL-001',
            date_of_birth=date(1990, 1, 1),
            gender='M',
            phone='+10000000000',
            emergency_contact='+19999999999',
            address='1 Release St',
            city='Test City',
            state='Test State',
            postal_code='12345'
        )

        self.test = LabTest.objects.create(
            name='CBC',
            code='CBC',
            category='Hematology',
            turnaround_time='2 hours'
        )

        self.order = LabOrder.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            status='processing'
        )
        self.order.items.add(self.test)

        self.client = APIClient()

    def test_release_flow_visibility(self):
        # Lab tech enters result
        self.client.force_authenticate(user=self.tech_user)
        enter_payload = {
            'test_code': self.test.code,
            'result_value': '13.2',
            'units': 'g/dL',
            'reference_range': '12-16',
            'flag': 'Normal',
            'notes': 'Within range',
        }
        response = self.client.post(
            f'/api/labs/worklist/{self.order.id}/enter_result/',
            enter_payload,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        result = LabResult.objects.filter(order=self.order, test=self.test).first()
        self.assertIsNotNone(result)
        self.assertFalse(result.released_to_patient)

        # Patient cannot see result before release
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/labs/results/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data
        results = payload.get('results', []) if isinstance(payload, dict) else payload
        self.assertEqual(len(results), 0)

        # Doctor releases result
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.post(f'/api/labs/results/{result.id}/release/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        result.refresh_from_db()
        self.assertTrue(result.released_to_patient)

        # Patient can now see result
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/labs/results/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data
        results = payload.get('results', []) if isinstance(payload, dict) else payload
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], result.id)
