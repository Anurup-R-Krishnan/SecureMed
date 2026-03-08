from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accounts.patients.models import Patient

User = get_user_model()

class TelemedicineTestCase(TestCase):
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
