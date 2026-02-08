from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from patients.models import Patient
from departments.models import Doctor, Department
from appointments.models import Appointment
from medical_records.models import MedicalRecord
from datetime import date, time, timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with test data for appointments and timeline'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # 1. Create Department
        dept, created = Department.objects.get_or_create(
            name='Cardiology',
            defaults={
                'code': 'CARD-01',
                'description': 'Heart stuff',
                'building': 'Wing A',
                'floor': 3,
                'phone': '555-0199',
                'email': 'cardiology@securemed.com'
            }
        )
        if created:
            self.stdout.write(f'Created Department: {dept.name}')

        # 2. Create Doctors
        # Doctor 1
        doc_user, created = User.objects.get_or_create(
            email='dr.house@securemed.com',
            defaults={
                'username': 'dr.house',  # Explicit username
                'first_name': 'Gregory', 
                'last_name': 'House',
                'role': 'doctor',
                'is_staff': True
            }
        )
        if created:
            doc_user.set_password('password123')
            doc_user.save()
        
        doctor, _ = Doctor.objects.get_or_create(
            user=doc_user,
            defaults={
                'doctor_id': 'DOC-101',
                'specialization': 'cardiology', 
                'department': dept,
                'license_number': 'MD-555-01',
                'qualification': 'MD, PhD',
                'experience_years': 15,
                'consultation_fee': 500.00,
                'phone': '555-DOC1'
            }
        )
        
        # Doctor 2
        doc_user2, created = User.objects.get_or_create(
            email='dr.wilson@securemed.com',
            defaults={
                'username': 'dr.wilson', # Explicit username
                'first_name': 'James', 
                'last_name': 'Wilson',
                'role': 'doctor',
                'is_staff': True
            }
        )
        if created:
            doc_user2.set_password('password123')
            doc_user2.save()
        
        doctor2, _ = Doctor.objects.get_or_create(
            user=doc_user2,
            defaults={
                'doctor_id': 'DOC-102',
                'specialization': 'general', 
                'department': dept,
                'license_number': 'MD-555-02',
                'qualification': 'MD',
                'experience_years': 12,
                'consultation_fee': 400.00,
                'phone': '555-DOC2'
            }
        )

        # 3. Create Patient
        pat_user, created = User.objects.get_or_create(
            email='john.doe@example.com',
            defaults={
                'username': 'john.doe', # Explicit username
                'first_name': 'John',
                'last_name': 'Doe',
                'role': 'patient'
            }
        )
        if created:
            pat_user.set_password('password123')
            pat_user.save()
        
        patient, _ = Patient.objects.get_or_create(
            user=pat_user,
            defaults={
                'patient_id': 'P-10001',
                'date_of_birth': date(1985, 5, 20),
                'gender': 'M',
                'phone': '555-0101',
                'emergency_contact': '555-0102',
                'address': '123 Fake St',
                'city': 'New York',
                'state': 'NY',
                'postal_code': '10001'
            }
        )

        # 4. Create Past Appointments (Timeline)
        for i in range(1, 4):
            d = date.today() - timedelta(days=i*10)
            appt_id = f'APT-HIST-{i}'
            if not Appointment.objects.filter(appointment_id=appt_id).exists():
                Appointment.objects.create(
                    appointment_id=appt_id,
                    patient=patient,
                    doctor=doctor,
                    appointment_date=d,
                    appointment_time=time(10, 0),
                    status='completed',
                    reason='Checkup',
                    created_by=pat_user
                )

                # Create Medical Record for this appointment
                MedicalRecord.objects.create(
                    record_id=f'REC-{i}',
                    patient=patient,
                    doctor=doctor,
                    record_type='consultation',
                    record_date=d,
                    diagnosis='Healthy',
                    notes='Patient is doing well.'
                )

        # 5. Create Future Appointments
        if not Appointment.objects.filter(appointment_id='APT-FUT-1').exists():
            Appointment.objects.create(
                appointment_id='APT-FUT-1',
                patient=patient,
                doctor=doctor2,
                appointment_date=date.today() + timedelta(days=5),
                appointment_time=time(14, 30),
                status='scheduled',
                reason='Follow-up',
                created_by=pat_user
            )
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded database with test data'))
