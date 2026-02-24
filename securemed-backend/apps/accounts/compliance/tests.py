from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Department

User = get_user_model()

class ConsentTestCase(TestCase):
    def test_department_creation(self):
        department = Department.objects.create(
            name='Cardiology',
            code='CARD',
            floor=2,
            building='Main Building',
            phone='+1234567890',
            email='cardio@hospital.com'
        )
        self.assertEqual(department.name, 'Cardiology')
        
    def test_patient_and_department(self):
        user = User.objects.create_user(
            username='consent1',
            email='consent@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        patient = Patient.objects.create(
            user=user,
            date_of_birth='1990-01-01'
        )
        department = Department.objects.create(
            name='Neurology',
            code='NEUR',
            floor=4,
            building='Main Building',
            phone='+1234567892',
            email='neuro@hospital.com'
        )
        self.assertEqual(patient.user.email, 'consent@example.com')
        self.assertEqual(department.code, 'NEUR')
