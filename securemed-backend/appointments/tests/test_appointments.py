from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import datetime, timedelta
from appointments.models import Appointment
from departments.models import Doctor, Department
from authentication.models import User
from patients.models import Patient

User = get_user_model()


class AppointmentModelTest(TestCase):
    """Test cases for Appointment model"""

    def setUp(self):
        # Create department
        self.dept = Department.objects.create(
            name='Cardiology',
            code='CARD',
            floor=1,
            building='A',
            phone='1234567890',
            email='card@test.com'
        )

        # Create doctor user
        self.doctor_user = User.objects.create_user(
            username='doctor_model_user',
            email='doctor_model@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            role='doctor'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DOC-MOD-001',
            specialization='cardiology',
            license_number='LIC-MOD-001',
            qualification='MD',
            experience_years=10,
            department=self.dept,
            consultation_fee=500.00,
            phone='1234567890'
        )

        # Create patient user
        self.patient_user = User.objects.create_user(
            username='patient_model_user',
            email='patient_model@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith',
            role='patient'
        )
        self.patient_profile = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-MOD-001',
            date_of_birth='1990-01-01',
            gender='F'
        )

    def test_create_appointment(self):
        """Test creating an appointment"""
        appointment_date = datetime.now().date() + timedelta(days=1)
        appointment = Appointment.objects.create(
            patient=self.patient_profile,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='10:00:00',
            reason='Regular checkup',
            status='scheduled',
            appointment_id='APT-TEST-001'
        )
        self.assertEqual(appointment.patient, self.patient_profile)
        self.assertEqual(appointment.doctor, self.doctor)
        self.assertEqual(appointment.status, 'scheduled')


class AppointmentAPITest(APITestCase):
    """Test cases for Appointment API endpoints"""

    def setUp(self):
        self.client = APIClient()

        # Create department
        self.dept = Department.objects.create(
            name='Neurology',
            code='NEUR',
            floor=2,
            building='B',
            phone='0987654321',
            email='neur@test.com'
        )

        # Create doctor
        self.doctor_user = User.objects.create_user(
            username='doctor_api_user',
            email='doctor_api@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            role='doctor'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id='DOC-API-001',
            specialization='neurology',
            license_number='LIC-API-001',
            qualification='MBBS',
            experience_years=5,
            department=self.dept,
            consultation_fee=600.00,
            phone='1122334455'
        )

        # Create patient
        self.patient_user = User.objects.create_user(
            username='patient_api_user',
            email='patient_api@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith',
            role='patient'
        )
        self.patient_profile = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-API-001',
            date_of_birth='1992-05-15',
            gender='F'
        )

    def test_list_doctors(self):
        """Test listing all doctors"""
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/appointments/doctors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data if isinstance(response.data, list) else response.data.get('results', [])
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Dr. John Doe')

    def test_accept_appointment_by_doctor(self):
        """Test that a doctor can accept (confirm) an appointment"""
        self.client.force_authenticate(user=self.doctor_user)
        appointment_date = datetime.now().date() + timedelta(days=1)
        # Create appointment
        appointment = Appointment.objects.create(
            patient=self.patient_profile,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='11:00:00',
            status='scheduled',
            appointment_id='APT-ACCEPT-01'
        )
        
        response = self.client.patch(
            f'/api/appointments/appointments/{appointment.id}/',
            {'status': 'confirmed'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, 'confirmed')

    def test_cancel_appointment(self):
        """Test cancelling an appointment"""
        self.client.force_authenticate(user=self.patient_user)
        appointment_date = datetime.now().date() + timedelta(days=1)
        appointment = Appointment.objects.create(
            patient=self.patient_profile,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='12:00:00',
            status='scheduled',
            appointment_id='APT-CANCEL-01'
        )
        
        response = self.client.patch(
            f'/api/appointments/appointments/{appointment.id}/',
            {'status': 'cancelled'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, 'cancelled')
