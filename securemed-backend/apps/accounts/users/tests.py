from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()

class AuthenticationTestCase(TestCase):
    def test_user_creation(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'patient')
        
    def test_user_role_assignment(self):
        doctor = User.objects.create_user(
            username='doctor1',
            email='doctor@example.com',
            password='TestPass123!@#',
            role='doctor'
        )
        self.assertEqual(doctor.role, 'doctor')
        
    def test_password_hashing(self):
        user = User.objects.create_user(
            username='hashtest',
            email='hash@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        self.assertNotEqual(user.password, 'TestPass123!@#')
        self.assertTrue(user.check_password('TestPass123!@#'))
