"""
Patient Timeline API Test
"""
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from datetime import date
from patients.models import Patient

User = get_user_model()

class TimelineApiTest(APITestCase):
    """Test suite for Patient Timeline API"""

    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            username='timeline_patient',
            email='timeline_patient@example.com',
            password='testpassword123',
            role='patient'
        )
        
        # Create Patient profile
        self.patient = Patient.objects.create(
            user=self.user,
            patient_id='PAT_TIMELINE_001',
            date_of_birth=date(1990, 1, 1),
            gender='M',
            phone='+1234567890',
            address='123 Test St',
            city='Test City',
            state='TS',
            postal_code='12345'
        )

    def test_timeline_api_access(self):
        """Test that timeline API manages access and returns 200"""
        self.client.force_authenticate(user=self.user)
        
        # Test Timeline
        print("\nFetching patient timeline...")
        response = self.client.get('/api/medical-records/timeline/')
        
        print(f"Status Code: {response.status_code}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Basic structure check matching the original script's expectations
        data = response.data
        if 'summary' in data:
            self.assertIn('total_events', data['summary'])
            self.assertIn('active_prescriptions', data['summary'])

