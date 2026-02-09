"""
Comprehensive database seeding script for SecureMed
Creates 5+ users for each role with realistic hospital data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
import random
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with realistic hospital data (5+ users per role)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting database seeding...')
        
        # Create users for each role
        self.create_patients()
        self.create_doctors()
        self.create_nurses()
        self.create_admin_staff()
        self.create_support_staff()
        
        # Create relationships and data
        self.create_appointments()
        self.create_medical_records()
        self.create_prescriptions()
        self.create_invoices()
        
        self.stdout.write(self.style.SUCCESS('Database seeding completed!'))

    def create_patients(self):
        from patients.models import Patient
        
        self.stdout.write('Creating patients...')
        patients_data = [
            {'username': 'patient1', 'email': 'patient1@example.com', 'first_name': 'John', 'last_name': 'Doe', 'dob': '1985-03-15', 'gender': 'M', 'insurance': 'Fortis Health Shield', 'insurance_num': 'FH-99887766'},
            {'username': 'patient2', 'email': 'patient2@example.com', 'first_name': 'Jane', 'last_name': 'Smith', 'dob': '1990-07-22', 'gender': 'F', 'insurance': 'Apollo Health Plus', 'insurance_num': 'AH-11223344'},
            {'username': 'patient3', 'email': 'patient3@example.com', 'first_name': 'Robert', 'last_name': 'Johnson', 'dob': '1978-11-30', 'gender': 'M', 'insurance': 'Max Bupa', 'insurance_num': 'MB-55667788'},
            {'username': 'patient4', 'email': 'patient4@example.com', 'first_name': 'Emily', 'last_name': 'Williams', 'dob': '1995-05-18', 'gender': 'F', 'insurance': 'Star Health', 'insurance_num': 'SH-99001122'},
            {'username': 'patient5', 'email': 'patient5@example.com', 'first_name': 'Michael', 'last_name': 'Brown', 'dob': '1982-09-25', 'gender': 'M', 'insurance': 'HDFC Ergo', 'insurance_num': 'HE-33445566'},
            {'username': 'patient6', 'email': 'patient6@example.com', 'first_name': 'Sarah', 'last_name': 'Davis', 'dob': '1988-12-10', 'gender': 'F', 'insurance': 'Fortis Health Shield', 'insurance_num': 'FH-77889900'},
        ]
        
        for data in patients_data:
            if not User.objects.filter(username=data['username']).exists():
                user = User.objects.create_user(
                    username=data['username'],
                    email=data['email'],
                    password='Ballsacks@123',
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    role='patient'
                )
                Patient.objects.create(
                    user=user,
                    patient_id=f"P-{data['username'].upper()}",
                    date_of_birth=data['dob'],
                    gender=data['gender'],
                    insurance_provider=data['insurance'],
                    insurance_number=data['insurance_num'],
                    phone=f"+91-98765{random.randint(10000, 99999)}",
                    emergency_contact=f"+91-98765{random.randint(10000, 99999)}",
                    address="123 Main St",
                    city="Mumbai",
                    state="Maharashtra",
                    postal_code="400001"
                )
                self.stdout.write(f"  Created patient: {data['username']}")

    def create_doctors(self):
        from departments.models import Doctor, Department
        
        self.stdout.write('Creating doctors...')
        
        # Ensure departments exist
        departments_data = [
            ('Cardiology', 'Heart and cardiovascular care', 'CARD'),
            ('Neurology', 'Brain and nervous system', 'NEURO'),
            ('Pediatrics', 'Child healthcare', 'PEDIA'),
            ('Orthopedics', 'Bone and joint care', 'ORTHO'),
            ('Dermatology', 'Skin care', 'DERMA'),
            ('General Practice', 'Primary care and checkups', 'GP'),
        ]
        
        for dept_name, desc, code in departments_data:
            Department.objects.get_or_create(
                name=dept_name,
                defaults={
                    'code': code,
                    'description': desc,
                    'floor': random.randint(1, 5),
                    'building': 'Main Building',
                    'phone': f"+91-22-2435{random.randint(1000, 9999)}",
                    'email': f"{dept_name.lower()}@hospital.com"
                }
            )
        
        doctors_data = [
            {'username': 'doctor1', 'email': 'doctor1@hospital.com', 'first_name': 'John', 'last_name': 'Smith', 'specialization': 'Cardiology', 'license': 'MCI-12345'},
            {'username': 'doctor2', 'email': 'doctor2@hospital.com', 'first_name': 'Sarah', 'last_name': 'Johnson', 'specialization': 'Neurology', 'license': 'MCI-23456'},
            {'username': 'doctor3', 'email': 'doctor3@hospital.com', 'first_name': 'David', 'last_name': 'Williams', 'specialization': 'Pediatrics', 'license': 'MCI-34567'},
            {'username': 'doctor4', 'email': 'doctor4@hospital.com', 'first_name': 'Lisa', 'last_name': 'Brown', 'specialization': 'Orthopedics', 'license': 'MCI-45678'},
            {'username': 'doctor5', 'email': 'doctor5@hospital.com', 'first_name': 'James', 'last_name': 'Davis', 'specialization': 'Dermatology', 'license': 'MCI-56789'},
            {'username': 'doctor6', 'email': 'doctor6@hospital.com', 'first_name': 'Emma', 'last_name': 'Wilson', 'specialization': 'Cardiology', 'license': 'MCI-67890'},
            {'username': 'doctor_gp', 'email': 'gp@hospital.com', 'first_name': 'Robert', 'last_name': 'General', 'specialization': 'General Practice', 'license': 'MCI-GP001'},
        ]
        
        for data in doctors_data:
            if not User.objects.filter(username=data['username']).exists():
                user = User.objects.create_user(
                    username=data['username'],
                    email=data['email'],
                    password='Doctor@123',
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    role='doctor'
                )
                dept = Department.objects.get(name=data['specialization'])
                Doctor.objects.create(
                    doctor_id=f"D-{data['username'].upper()}",
                    user=user,
                    department=dept,
                    specialization=data['specialization'],
                    license_number=data['license'],
                    qualification="MBBS, MD",
                    experience_years=random.randint(5, 20),
                    consultation_fee=random.randint(500, 2000),
                    phone=f"+91-98765{random.randint(10000, 99999)}"
                )
                self.stdout.write(f"  Created doctor: {data['username']} ({data['specialization']})")

    def create_nurses(self):
        # Nurses would require a Nurse model - skipping for now
        self.stdout.write('Skipping nurses (model not implemented)')

    def create_admin_staff(self):
        self.stdout.write('Creating admin staff...')
        admin_data = [
            {'username': 'admin1', 'email': 'admin1@hospital.com', 'first_name': 'Admin', 'last_name': 'One'},
            {'username': 'admin2', 'email': 'admin2@hospital.com', 'first_name': 'Admin', 'last_name': 'Two'},
            {'username': 'admin3', 'email': 'admin3@hospital.com', 'first_name': 'Admin', 'last_name': 'Three'},
            {'username': 'admin4', 'email': 'admin4@hospital.com', 'first_name': 'Admin', 'last_name': 'Four'},
            {'username': 'admin5', 'email': 'admin5@hospital.com', 'first_name': 'Admin', 'last_name': 'Five'},
        ]
        
        for data in admin_data:
            if not User.objects.filter(username=data['username']).exists():
                User.objects.create_user(
                    username=data['username'],
                    email=data['email'],
                    password='Admin@123',
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    role='admin',
                    is_staff=True
                )
                self.stdout.write(f"  Created admin: {data['username']}")

    def create_support_staff(self):
        self.stdout.write('Creating support staff...')
        staff_data = [
            {'username': 'staff1', 'email': 'staff1@hospital.com', 'first_name': 'Support', 'last_name': 'One'},
            {'username': 'staff2', 'email': 'staff2@hospital.com', 'first_name': 'Support', 'last_name': 'Two'},
            {'username': 'staff3', 'email': 'staff3@hospital.com', 'first_name': 'Support', 'last_name': 'Three'},
            {'username': 'staff4', 'email': 'staff4@hospital.com', 'first_name': 'Support', 'last_name': 'Four'},
            {'username': 'staff5', 'email': 'staff5@hospital.com', 'first_name': 'Support', 'last_name': 'Five'},
        ]
        
        for data in staff_data:
            if not User.objects.filter(username=data['username']).exists():
                User.objects.create_user(
                    username=data['username'],
                    email=data['email'],
                    password='Staff@123',
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    role='staff'
                )
                self.stdout.write(f"  Created staff: {data['username']}")

    def create_appointments(self):
        from appointments.models import Appointment
        from patients.models import Patient
        from departments.models import Doctor
        
        self.stdout.write('Creating appointments...')
        patients = list(Patient.objects.all())
        doctors = list(Doctor.objects.all())
        
        if not patients or not doctors:
            self.stdout.write('  Skipping appointments (no patients or doctors)')
            return
        
        for i in range(15):
            patient = random.choice(patients)
            doctor = random.choice(doctors)
            days_offset = random.randint(-30, 30)
            appt_date = date.today() + timedelta(days=days_offset)
            
            Appointment.objects.get_or_create(
                patient=patient,
                doctor=doctor,
                appointment_date=appt_date,
                defaults={
                    'appointment_id': f"APT-{random.randint(10000, 99999)}",
                    'appointment_time': timezone.now().time(),
                    'status': random.choice(['scheduled', 'completed', 'cancelled']),
                    'reason': random.choice(['Routine checkup', 'Follow-up', 'Consultation', 'Emergency'])
                }
            )
        
        self.stdout.write(f"  Created {Appointment.objects.count()} appointments")

    def create_medical_records(self):
        from medical_records.models import MedicalRecord
        from patients.models import Patient
        from departments.models import Doctor
        
        self.stdout.write('Creating medical records (doctor-created only)...')
        patients = list(Patient.objects.all())
        doctors = list(Doctor.objects.all())
        
        if not patients or not doctors:
            return
        
        for i in range(20):
            patient = random.choice(patients)
            doctor = random.choice(doctors)
            
            MedicalRecord.objects.create(
                record_id=f"REC-{uuid.uuid4().hex[:8].upper()}",
                patient=patient,
                doctor=doctor,
                record_type=random.choice(['consultation', 'lab_report', 'imaging']),
                record_date=date.today() - timedelta(days=random.randint(1, 365)),
                diagnosis=random.choice(['Hypertension', 'Diabetes Type 2', 'Common Cold', 'Migraine', 'Arthritis']),
                notes=f"Clinical notes by Dr. {doctor.user.last_name}"
            )
        
        self.stdout.write(f"  Created {MedicalRecord.objects.count()} medical records")

    def create_prescriptions(self):
        from medical_records.models import MedicalRecord, Prescription
        
        self.stdout.write('Creating prescriptions...')
        records = MedicalRecord.objects.all()[:10]
        
        medications = [
            ('Lisinopril', '10mg', 'Once daily'),
            ('Metformin', '500mg', 'Twice daily'),
            ('Atorvastatin', '20mg', 'Once daily at bedtime'),
            ('Amlodipine', '5mg', 'Once daily'),
            ('Omeprazole', '20mg', 'Once daily before breakfast'),
        ]
        
        for record in records:
            med_name, dosage, frequency = random.choice(medications)
            prescription = Prescription.objects.create(
                medical_record=record,
                medication_name=med_name,
                dosage=dosage,
                frequency=frequency,
                duration='30 days',
                instructions='Take with water',
                status='signed',
                is_signed=True,
                signed_by=record.doctor.user,
                signed_at=timezone.now()
            )
            prescription.signature_hash = prescription.generate_signature_hash()
            prescription.save()
        
        self.stdout.write(f"  Created {Prescription.objects.count()} prescriptions")

    def create_invoices(self):
        from billing.models import Invoice, InvoiceItem
        from patients.models import Patient
        from appointments.models import Appointment
        
        self.stdout.write('Creating invoices...')
        appointments = Appointment.objects.filter(status='completed')[:10]
        
        for appt in appointments:
            invoice = Invoice.objects.create(
                invoice_id=f"INV-{random.randint(1000, 9999)}",
                patient=appt.patient,
                appointment=appt,
                due_date=date.today() + timedelta(days=30),
                status=random.choice(['issued', 'paid']),
                subtotal=random.randint(500, 5000),
                tax_amount=0,
                discount_amount=0,
                total_amount=random.randint(500, 5000)
            )
            invoice.paid_amount = invoice.total_amount if invoice.status == 'paid' else 0
            invoice.save()
            
            InvoiceItem.objects.create(
                invoice=invoice,
                item_type='consultation',
                description=f"Consultation with Dr. {appt.doctor.user.last_name}",
                quantity=1,
                unit_price=invoice.total_amount,
                total_price=invoice.total_amount
            )
        
        self.stdout.write(f"  Created {Invoice.objects.count()} invoices")
