from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.patients.models import Patient

from . import views as telemedicine_views
from .models import ConditionCatalog

User = get_user_model()

class TelemedicineTestCase(TestCase):
    def setUp(self):
        self.api_client = APIClient()

    def test_user_roles_for_telemedicine(self):
        patient_user = User.objects.create_user(
            username='patient_tele',
            email='patient@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        doctor_user = User.objects.create_user(
            username='doctor_tele',
            email='doctor@example.com',
            password='TestPass123!@#',
            role='doctor'
        )
        self.assertEqual(patient_user.role, 'patient')
        self.assertEqual(doctor_user.role, 'doctor')
        
    def test_patient_for_telemedicine(self):
        patient_user = User.objects.create_user(
            username='patient_tele2',
            email='patient2@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        patient = Patient.objects.create(
            user=patient_user,
            date_of_birth='1990-01-01'
        )
        self.assertIsNotNone(patient)

    @mock.patch.object(telemedicine_views, '_generate_condition_pain_profile', return_value=None)
    def test_condition_visualization_contains_pain_payload(self, _mock_profile):
        user = User.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        self.api_client.force_authenticate(user=user)

        condition = ConditionCatalog.objects.create(
            condition_id='gas_buildup',
            name='Gas Buildup',
            overview='Gas-related abdominal discomfort pattern.',
            regions=['chest', 'abdomen'],
            region_pain_levels={'chest': 5, 'abdomen': 8},
            pain_interpretations={
                'chest': [{'min': 4, 'max': 6, 'message': 'Moderate chest discomfort may be gas-related.', 'urgency': 'soon'}],
                'abdomen': [{'min': 7, 'max': 10, 'message': 'Severe abdominal pain needs urgent review.', 'urgency': 'emergency'}],
            },
            typical_symptoms=['bloating', 'burping'],
            seek_care_rules=['Escalate if pain worsens rapidly.'],
            scope='top20',
            is_active=True,
        )

        url = reverse('condition-visualization', kwargs={'condition_id': condition.condition_id})
        response = self.api_client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('region_pain_levels', response.data)
        self.assertIn('pain_interpretations', response.data)
        abdomen_pain = int(response.data['region_pain_levels'].get('abdomen', 0))
        self.assertGreaterEqual(abdomen_pain, 1)
        self.assertLessEqual(abdomen_pain, 10)

    def test_condition_match_requires_regions(self):
        user = User.objects.create_user(
            username='matcher',
            email='matcher@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        self.api_client.force_authenticate(user=user)

        url = reverse('condition-match')
        response = self.api_client.post(url, {'regions': [], 'intensityByRegion': {}}, format='json')
        self.assertEqual(response.status_code, 400)
