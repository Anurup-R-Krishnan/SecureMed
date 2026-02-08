from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import datetime, timedelta
from appointments.models import Appointment, Doctor
from authentication.models import User

User = get_user_model()


class DoctorModelTest(TestCase):
    """Test cases for Doctor model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='doctor@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            role='doctor'
        )

    def test_create_doctor(self):
        """Test creating a doctor profile"""
        doctor = Doctor.objects.create(
            user=self.user,
            specialization='Cardiology',
            license_number='DOC123456',
            department='Cardiology',
            consultation_fee=500
        )
        self.assertEqual(doctor.user.email, 'doctor@test.com')
        self.assertEqual(doctor.specialization, 'Cardiology')
        self.assertEqual(doctor.consultation_fee, 500)

    def test_doctor_str_representation(self):
        """Test string representation of doctor"""
        doctor = Doctor.objects.create(
            user=self.user,
            specialization='Cardiology',
            license_number='DOC123456',
            department='Cardiology'
        )
        expected = f"Dr. {self.user.get_full_name()} - Cardiology"
        self.assertEqual(str(doctor), expected)


class AppointmentModelTest(TestCase):
    """Test cases for Appointment model"""

    def setUp(self):
        # Create doctor user
        self.doctor_user = User.objects.create_user(
            email='doctor@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            role='doctor'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            specialization='Cardiology',
            license_number='DOC123456',
            department='Cardiology'
        )

        # Create patient user
        self.patient_user = User.objects.create_user(
            email='patient@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith',
            role='patient'
        )

    def test_create_appointment(self):
        """Test creating an appointment"""
        appointment_date = datetime.now().date() + timedelta(days=1)
        appointment = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='10:00:00',
            reason='Regular checkup',
            status='scheduled'
        )
        self.assertEqual(appointment.patient, self.patient_user)
        self.assertEqual(appointment.doctor, self.doctor)
        self.assertEqual(appointment.status, 'scheduled')

    def test_appointment_str_representation(self):
        """Test string representation of appointment"""
        appointment_date = datetime.now().date() + timedelta(days=1)
        appointment = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='10:00:00',
            status='scheduled'
        )
        self.assertIn(str(appointment_date), str(appointment))


class AppointmentAPITest(APITestCase):
    """Test cases for Appointment API endpoints"""

    def setUp(self):
        self.client = APIClient()

        # Create doctor
        self.doctor_user = User.objects.create_user(
            email='doctor@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            role='doctor'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            specialization='Cardiology',
            license_number='DOC123456',
            department='Cardiology',
            consultation_fee=500
        )

        # Create patient
        self.patient_user = User.objects.create_user(
            email='patient@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith',
            role='patient'
        )

    def test_list_doctors(self):
        """Test listing all doctors"""
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/appointments/doctors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Dr. John Doe')

    def test_filter_doctors_by_specialty(self):
        """Test filtering doctors by specialization"""
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/appointments/doctors/?specialty=Cardiology')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_appointment_authenticated(self):
        """Test creating appointment as authenticated patient"""
        self.client.force_authenticate(user=self.patient_user)
        appointment_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        data = {
            'doctor': self.doctor.id,
            'appointment_date': appointment_date,
            'appointment_time': '10:00:00',
            'reason': 'Regular checkup'
        }
        
        response = self.client.post('/api/appointments/appointments/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Appointment.objects.count(), 1)
        appointment = Appointment.objects.first()
        self.assertEqual(appointment.patient, self.patient_user)
        self.assertEqual(appointment.doctor, self.doctor)

    def test_create_appointment_unauthenticated(self):
        """Test creating appointment without authentication"""
        appointment_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        data = {
            'doctor': self.doctor.id,
            'appointment_date': appointment_date,
            'appointment_time': '10:00:00',
            'reason': 'Regular checkup'
        }
        
        response = self.client.post('/api/appointments/appointments/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_patient_appointments(self):
        """Test listing appointments for authenticated patient"""
        self.client.force_authenticate(user=self.patient_user)
        
        # Create appointment
        appointment_date = datetime.now().date() + timedelta(days=1)
        Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='10:00:00',
            status='scheduled'
        )
        
        response = self.client.get('/api/appointments/appointments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_cannot_book_past_date(self):
        """Test that appointments cannot be booked for past dates"""
        self.client.force_authenticate(user=self.patient_user)
        past_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        data = {
            'doctor': self.doctor.id,
            'appointment_date': past_date,
            'appointment_time': '10:00:00',
            'reason': 'Regular checkup'
        }
        
        response = self.client.post('/api/appointments/appointments/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_appointment(self):
        """Test cancelling an appointment"""
        self.client.force_authenticate(user=self.patient_user)
        
        # Create appointment
        appointment_date = datetime.now().date() + timedelta(days=1)
        appointment = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            appointment_date=appointment_date,
            appointment_time='10:00:00',
            status='scheduled'
        )
        
        response = self.client.patch(
            f'/api/appointments/appointments/{appointment.id}/',
            {'status': 'cancelled'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, 'cancelled')
