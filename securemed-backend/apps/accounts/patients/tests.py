from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accounts.patients.models import Patient

User = get_user_model()

class PatientTestCase(TestCase):
    def test_patient_creation(self):
        user = User.objects.create_user(
            username='patient1',
            email='patient@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        patient = Patient.objects.create(
            user=user,
            patient_id='P001',
            date_of_birth='1990-01-01',
            gender='M',
            blood_group='O+',
            phone='+1234567890',
            emergency_contact='+1234567891',
            address='123 Main St',
            city='New York',
            state='NY',
            postal_code='10001'
        )
        self.assertEqual(patient.user.email, 'patient@example.com')
        self.assertEqual(patient.blood_group, 'O+')
        
    def test_patient_user_relationship(self):
        user = User.objects.create_user(
            username='patient2',
            email='patient2@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        patient = Patient.objects.create(
            user=user,
            patient_id='P002',
            date_of_birth='1985-05-15',
            gender='F',
            phone='+1234567892',
            emergency_contact='+1234567893',
            address='456 Oak Ave',
            city='Boston',
            state='MA',
            postal_code='02101'
        )
        self.assertEqual(patient.user, user)
