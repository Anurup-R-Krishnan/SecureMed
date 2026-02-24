from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class AnalyticsTestCase(TestCase):
    def test_admin_user_creation(self):
        admin_user = User.objects.create_user(
            username='admin1',
            email='admin@example.com',
            password='TestPass123!@#',
            role='admin'
        )
        self.assertEqual(admin_user.role, 'admin')
        
    def test_multiple_user_roles(self):
        patient = User.objects.create_user(
            username='patient_analytics',
            email='patient@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        doctor = User.objects.create_user(
            username='doctor_analytics',
            email='doctor@example.com',
            password='TestPass123!@#',
            role='doctor'
        )
        admin = User.objects.create_user(
            username='admin_analytics',
            email='admin2@example.com',
            password='TestPass123!@#',
            role='admin'
        )
        self.assertEqual(User.objects.count(), 3)
