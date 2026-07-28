
"""
Comprehensive database seeding for SecureMed.
Consolidates logic from previous seed scripts and adds Pharmacy support.

Run with:  python manage.py seed_db
Reset:     python manage.py seed_db --flush
"""
import random
import uuid
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()

# ---------------------------------------------------------------------------
# Static seed data
# ---------------------------------------------------------------------------

PASSWORD = "SecureMed@123"

DEPARTMENTS = [
    ("Cardiology", "CARD", "Heart and cardiovascular care", 2, "Main Building"),
    ("Neurology", "NEURO", "Brain and nervous system care", 3, "Main Building"),
    ("Pediatrics", "PEDIA", "Child healthcare services", 1, "East Wing"),
    ("Orthopedics", "ORTHO", "Bone, joint, and muscle care", 2, "Main Building"),
    ("Dermatology", "DERMA", "Skin, hair, and nail care", 1, "West Wing"),
    ("General Medicine", "GENMED", "Primary care and general consultation", 1, "Main Building"),
    ("Psychiatry", "PSYCH", "Mental health services", 4, "North Wing"),
    ("Radiology", "RAD", "Diagnostic imaging", 0, "Basement Block"),
    ("Pharmacy", "PHARM", "In-house Pharmacy", 1, "Main Building"),
]

DOCTORS = [
    # (username, email, first, last, specialization, dept_name, license, qualification, exp_years, fee)
    ("dr.smith", "dr.smith@securemed.com", "John", "Smith", "cardiology", "Cardiology", "MCI-10001", "MBBS, MD Cardiology", 18, 1500),
    ("dr.johnson", "dr.johnson@securemed.com", "Sarah", "Johnson", "neurology", "Neurology", "MCI-10002", "MBBS, DM Neurology", 14, 1800),
    ("dr.williams", "dr.williams@securemed.com", "David", "Williams", "pediatrics", "Pediatrics", "MCI-10003", "MBBS, DCH", 10, 800),
    ("dr.brown", "dr.brown@securemed.com", "Lisa", "Brown", "orthopedics", "Orthopedics", "MCI-10004", "MBBS, MS Ortho", 22, 1200),
    ("dr.davis", "dr.davis@securemed.com", "James", "Davis", "dermatology", "Dermatology", "MCI-10005", "MBBS, MD Dermatology", 9, 1000),
    ("dr.wilson", "dr.wilson@securemed.com", "Emma", "Wilson", "cardiology", "Cardiology", "MCI-10006", "MBBS, MD Cardiology", 12, 1400),
    ("dr.kumar", "dr.kumar@securemed.com", "Rajesh", "Kumar", "general", "General Medicine", "MCI-10007", "MBBS", 25, 600),
    ("dr.patel", "dr.patel@securemed.com", "Priya", "Patel", "psychiatry", "Psychiatry", "MCI-10008", "MBBS, MD Psychiatry", 11, 1600),
    ("dr.chen", "dr.chen@securemed.com", "Michael", "Chen", "radiology", "Radiology", "MCI-10009", "MBBS, MD Radiology", 15, 2000),
    ("dr.gupta", "dr.gupta@securemed.com", "Anita", "Gupta", "pediatrics", "Pediatrics", "MCI-10010", "MBBS, MD Pediatrics", 8, 900),
]

PATIENTS = [
    # (username, email, first, last, dob, gender, blood, phone, insurance_prov, insurance_num, allergies, chronic, city)
    ("rahul.verma", "rahul.verma@example.com", "Rahul", "Verma", "1985-03-15", "M", "O+", "+919876500001", "Fortis Health Shield", "FH-990001", "Penicillin", "Hypertension", "Mumbai"),
    ("priya.singh", "priya.singh@example.com", "Priya", "Singh", "1990-07-22", "F", "A+", "+919876500002", "Apollo Health Plus", "AH-110002", "", "Asthma", "Delhi"),
    ("vikram.patil", "vikram.patil@example.com", "Vikram", "Patil", "1978-11-30", "M", "B+", "+919876500003", "Max Bupa", "MB-550003", "Sulfa drugs", "Diabetes Type 2", "Bangalore"),
    ("sneha.reddy", "sneha.reddy@example.com", "Sneha", "Reddy", "1995-05-18", "F", "AB-", "+919876500004", "Star Health", "SH-990004", "", "", "Hyderabad"),
    ("amit.kumar", "amit.kumar@example.com", "Amit", "Kumar", "1982-09-25", "M", "A-", "+919876500005", "HDFC Ergo", "HE-330005", "Aspirin", "Arthritis, High Cholesterol", "Chennai"),
    ("anjali.desai", "anjali.desai@example.com", "Anjali", "Desai", "1988-12-10", "F", "O-", "+919876500006", "ICICI Lombard", "IL-770006", "", "Migraine", "Pune"),
    ("rohan.mehta", "rohan.mehta@example.com", "Rohan", "Mehta", "1972-01-05", "M", "B-", "+919876500007", "Bajaj Allianz", "BA-440007", "Latex", "COPD", "Kolkata"),
    ("kavita.nair", "kavita.n@example.com", "Kavita", "Nair", "2000-08-14", "F", "AB+", "+919876500008", "Fortis Health Shield", "FH-220008", "", "", "Kochi"),
    # Additional patients for more realistic data
    ("sanjay.shah", "sanjay.shah@example.com", "Sanjay", "Shah", "1975-06-20", "M", "O+", "+919876500009", "Max Bupa", "MB-550009", "Nuts", "Hypertension, Diabetes Type 2", "Ahmedabad"),
    ("meera.iyer", "meera.iyer@example.com", "Meera", "Iyer", "1992-04-12", "F", "A+", "+919876500010", "Star Health", "SH-990010", "", "Thyroid", "Bangalore"),
    ("arjun.rao", "arjun.rao@example.com", "Arjun", "Rao", "1998-09-03", "M", "B+", "+919876500011", "Apollo Health Plus", "AH-110011", "Shellfish", "", "Hyderabad"),
    ("divya.khanna", "divya.khanna@example.com", "Divya", "Khanna", "1986-11-28", "F", "AB-", "+919876500012", "ICICI Lombard", "IL-770012", "", "Anemia", "Delhi"),
    ("rakesh.joshi", "rakesh.joshi@example.com", "Rakesh", "Joshi", "1970-02-14", "M", "A-", "+919876500013", "Bajaj Allianz", "BA-440013", "Iodine", "Cardiovascular Disease", "Pune"),
    ("pooja.menon", "pooja.menon@example.com", "Pooja", "Menon", "1994-07-30", "F", "O-", "+919876500014", "Fortis Health Shield", "FH-220014", "", "", "Kochi"),
    ("nikhil.saxena", "nikhil.saxena@example.com", "Nikhil", "Saxena", "1980-12-05", "M", "B-", "+919876500015", "HDFC Ergo", "HE-330015", "Bee Stings", "Back Pain, Arthritis", "Mumbai"),
    ("ritu.malhotra", "ritu.malhotra@example.com", "Ritu", "Malhotra", "1991-08-19", "F", "AB+", "+919876500016", "Max Bupa", "MB-550016", "", "PCOS", "Delhi"),
    ("varun.kapoor", "varun.kapoor@example.com", "Varun", "Kapoor", "1977-03-22", "M", "O+", "+919876500017", "Star Health", "SH-990017", "Dust", "Asthma", "Bangalore"),
    ("swati.bhatt", "swati.bhatt@example.com", "Swati", "Bhatt", "1989-05-16", "F", "A+", "+919876500018", "Apollo Health Plus", "AH-110018", "", "", "Ahmedabad"),
    ("karan.pillai", "karan.pillai@example.com", "Karan", "Pillai", "1983-10-11", "M", "B+", "+919876500019", "ICICI Lombard", "IL-770019", "Soy", "High Cholesterol", "Chennai"),
    ("shreya.das", "shreya.das@example.com", "Shreya", "Das", "1996-01-27", "F", "AB-", "+919876500020", "Bajaj Allianz", "BA-440020", "", "", "Kolkata"),
]

PHARMACISTS = [
    ("pharm.user", "pharmacist@securemed.com", "Ramesh", "Gupta", "MPharm"),
]

PROVIDERS = [
    ("provider.user", "provider@securemed.com", "Aarav", "Menon", "General Provider"),
]

LAB_TECHNICIANS = [
    ("lab.tech", "lab.tech@securemed.com", "Neha", "Sharma", "BSc MLT"),
]

DRUGS = [
    # (name, generic, manufacturer, form, strength, price, reorder_level)
    ("Dolo 650", "Paracetamol", "Micro Labs", "Tablet", "650 mg", 2.00, 100),
    ("Augmentin 625", "Amoxicillin + Clavulanic Acid", "GSK", "Tablet", "625 mg", 22.00, 50),
    ("Pan D", "Pantoprazole + Domperidone", "Alkem", "Capsule", "40mg + 30mg", 12.00, 80),
    ("Thyronorm", "Thyroxine Sodium", "Abbott", "Tablet", "50 mcg", 3.00, 100),
    ("Telma 40", "Telmisartan", "Glenmark", "Tablet", "40 mg", 8.00, 60),
    ("Glycomet 500", "Metformin", "USV", "Tablet", "500 mg", 4.00, 100),
    ("Atorva 20", "Atorvastatin", "Zydus", "Tablet", "20 mg", 15.00, 40),
    ("Shelcal 500", "Calcium + Vitamin D3", "Torrent", "Tablet", "500 mg", 6.00, 80),
    ("Allegra 120", "Fexofenadine", "Sanofi", "Tablet", "120 mg", 18.00, 30),
    ("Ascoril LS", "Levosalbutamol + Ambroxol", "Glenmark", "Syrup", "100 ml", 120.00, 20),
    # Additional medications
    ("Crocin Advance", "Paracetamol", "GSK", "Tablet", "500 mg", 1.50, 150),
    ("Azithral 500", "Azithromycin", "Alembic", "Tablet", "500 mg", 28.00, 40),
    ("Cipla Cetirizine", "Cetirizine", "Cipla", "Tablet", "10 mg", 1.80, 120),
    ("Omez 20", "Omeprazole", "Dr Reddy's", "Capsule", "20 mg", 8.50, 60),
    ("Combiflam", "Ibuprofen + Paracetamol", "Sanofi", "Tablet", "400mg + 325mg", 3.50, 100),
    ("Ecosprin 75", "Aspirin", "USV", "Tablet", "75 mg", 1.20, 150),
    ("Montair LC", "Montelukast + Levocetirizine", "Cipla", "Tablet", "10mg + 5mg", 12.00, 50),
    ("Betadine Ointment", "Povidone Iodine", "Win-Medicare", "Ointment", "5%", 45.00, 30),
    ("Neurobion Forte", "Vitamin B Complex", "Merck", "Tablet", "Multi", 5.00, 80),
    ("Cheston Cold", "Phenylephrine + Paracetamol", "Cipla", "Tablet", "5mg + 500mg", 2.50, 100),
]

DIAGNOSES = [
    "Essential Hypertension", "Type 2 Diabetes Mellitus", "Acute Upper Respiratory Infection",
    "Chronic Migraine", "Osteoarthritis of Knee", "Allergic Contact Dermatitis",
    "Generalized Anxiety Disorder", "Iron Deficiency Anemia", "Lumbar Spondylosis",
    "Viral Gastroenteritis", "Bronchial Asthma – Mild Persistent", "Hypothyroidism",
]

MEDICATIONS = [
    ("Amlodipine", "5 mg", "Once daily", "90 days", "Take on empty stomach"),
    ("Metformin", "500 mg", "Twice daily", "90 days", "Take with meals"),
    ("Atorvastatin", "20 mg", "Once daily", "90 days", "Take at bedtime"),
    ("Azithromycin", "500 mg", "Once daily", "3 days", "Complete full course"),
    ("Paracetamol", "650 mg", "SOS", "5 days", "Max 3 per day"),
]

LAB_TESTS = [
    ("Complete Blood Count", "CBC-001", "Hematology", "4 hours", "Measures red blood cells, white blood cells, and platelets"),
    ("Lipid Profile", "LIP-001", "Chemistry", "6 hours", "Measures cholesterol and triglyceride levels"),
    ("Thyroid Stimulating Hormone", "TSH-001", "Endocrine", "8 hours", "Evaluates thyroid function"),
    ("Hemoglobin A1c", "HBA1C-001", "Hematology", "24 hours", "Measures average blood sugar over 3 months"),
    ("Liver Function Test", "LFT-001", "Chemistry", "6 hours", "Assesses liver health and function"),
    ("Kidney Function Test", "KFT-001", "Chemistry", "6 hours", "Evaluates kidney health and function"),
    ("Urinalysis", "UA-001", "Urinalysis", "2 hours", "Analyzes urine for various conditions"),
    ("Chest X-Ray", "CXR-001", "Other", "1 hour", "Imaging of chest and lungs"),
    ("ECG", "ECG-001", "Other", "30 minutes", "Records electrical activity of the heart"),
    ("Blood Glucose Fasting", "BGF-001", "Chemistry", "4 hours", "Measures blood sugar after fasting"),
]

WELLNESS_TIPS = [
    ("Stay Hydrated", "Drink at least 8 glasses (2 litres) of water every day.", "hydration"),
    ("Walk 10,000 Steps", "Aim for 10,000 steps daily.", "exercise"),
    ("Sleep 7-8 Hours", "Adults need 7-8 hours of quality sleep.", "sleep"),
    ("Eat More Greens", "Include leafy greens like spinach and kale.", "nutrition"),
]


class Command(BaseCommand):
    help = "Seed the entire SecureMed database with realistic data (Consolidated)"

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete ALL existing seed data before re-seeding")

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        self.stdout.write(self.style.WARNING("\n======================================"))
        self.stdout.write(self.style.WARNING("  SecureMed - Consolidated Seed"))
        self.stdout.write(self.style.WARNING("======================================\n"))

        depts = self._seed_departments()
        doctors = self._seed_doctors(depts)
        patients = self._seed_patients()
        self._seed_pharmacists()  # NEW
        self._seed_providers()
        self._seed_lab_technicians()
        self._seed_admin()
        
        appointments = self._seed_appointments(patients, doctors)
        records = self._seed_medical_records(patients, doctors, appointments)
        self._seed_prescriptions(records, doctors)
        self._seed_vital_signs(patients)
        
        lab_tests = self._seed_lab_tests()
        self._seed_lab_orders(patients, doctors, lab_tests)
        
        self._seed_pharmacy_data()  # NEW
        
        self._seed_conversations_and_messages(doctors, patients)
        self._seed_referrals(patients, doctors, depts)
        self._seed_invoices(patients, appointments)
        self._seed_wellness_tips()
        try:
            self.stdout.write("[-] Seeding Rahul Verma showcase patient...")
            self._seed_showcase_patient(patients, doctors, depts, lab_tests)
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"  [!] Rahul showcase seed skipped: {exc}"))
        try:
            self.stdout.write("[-] Seeding anatomy education content...")
            call_command("seed_anatomy_content")
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"  [!] Anatomy content seed skipped: {exc}"))
        try:
            self.stdout.write("[-] Seeding infection tracking graph...")
            call_command("ensure_infection_demo_data")
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"  [!] Infection graph seed skipped: {exc}"))

        self.stdout.write(self.style.SUCCESS("\n[+] Seeding complete!"))
        self._print_role_summary()
        self.stdout.write(self.style.SUCCESS(f"    Password for all users: {PASSWORD}\n"))

    def _flush(self):
        self.stdout.write(self.style.WARNING("Flushing existing seed data …"))
        # Import models here to avoid circular imports during startup
        from apps.accounts.patients.models import Patient, WellnessTip
        from apps.clinical.diagnostics.models import LabOrder, LabResult
        from apps.clinical.diagnostics.models import LabTest as LabsCatalog
        from apps.clinical.pharmacy.models import (
            Drug,
            DrugBatch,
            DrugStock,
            StockTransaction,
        )
        from apps.clinical.records.models import (
            EmergencyAccessLog,
            MedicalRecord,
            MedicalRecordAccess,
            Prescription,
            VitalSign,
        )
        from apps.clinical.records.models import (
            LabTest as MRLabTest,
        )
        from apps.clinical.telemedicine.models import (
            AnatomyRegionExplainer,
            ConditionCatalog,
            ConditionPin,
            Conversation,
            Message,
            TriageRequest,
            VideoRoom,
        )
        from apps.finance.billing.models import Invoice, InvoiceItem, Payment
        from apps.scheduling.appointments.models import Appointment, Referral
        from apps.scheduling.availability.models import Department, Doctor

        # Delete in order of dependencies
        StockTransaction.objects.all().delete()
        DrugBatch.objects.all().delete()
        DrugStock.objects.all().delete()
        Drug.objects.all().delete()
        
        Message.objects.all().delete()
        Conversation.objects.all().delete()
        VideoRoom.objects.all().delete()
        TriageRequest.objects.all().delete()
        ConditionPin.objects.all().delete()
        ConditionCatalog.objects.all().delete()
        AnatomyRegionExplainer.objects.all().delete()
        Payment.objects.all().delete()
        InvoiceItem.objects.all().delete()
        Invoice.objects.all().delete()
        Prescription.objects.all().delete()
        MedicalRecordAccess.objects.all().delete()
        EmergencyAccessLog.objects.all().delete()
        MRLabTest.objects.all().delete()
        MedicalRecord.objects.all().delete()
        LabResult.objects.all().delete()
        LabOrder.objects.all().delete()
        LabsCatalog.objects.all().delete()
        VitalSign.objects.all().delete()
        Referral.objects.all().delete()
        Appointment.objects.all().delete()
        WellnessTip.objects.all().delete()
        Patient.objects.all().delete()
        Doctor.objects.all().delete()
        Department.objects.all().delete()
        
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write("  Flush done.\n")

    def _seed_departments(self):
        from apps.scheduling.availability.models import Department
        self.stdout.write("[-] Seeding departments...")
        result = {}
        for name, code, desc, floor, building in DEPARTMENTS:
            dept, created = Department.objects.get_or_create(
                name=name,
                defaults={
                    "code": code,
                    "description": desc,
                    "floor": floor,
                    "building": building,
                    "phone": f"+91-22-2400{random.randint(1000,9999)}",
                    "email": f"{code.lower()}@securemed.com",
                },
            )
            result[name] = dept
            if created: self.stdout.write(f"    + {name}")
        return result

    def _seed_doctors(self, depts):
        from apps.scheduling.availability.models import Department, Doctor
        self.stdout.write("[-] Seeding doctors...")
        result = []
        for i, (uname, email, first, last, spec, dept_name, lic, qual, exp, fee) in enumerate(DOCTORS, 1):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": uname,
                    "first_name": first,
                    "last_name": last,
                    "role": "doctor",
                    "is_active": True,
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()

            dept = depts.get(dept_name)
            # Fallback if dept not found (e.g. if Department names changed)
            if not dept: 
                dept = Department.objects.filter(name__icontains=spec).first()

            doc, doc_created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "doctor_id": f"DOC-{i:04d}",
                    "specialization": spec,
                    "department": dept,
                    "license_number": lic,
                    "qualification": qual,
                    "experience_years": exp,
                    "consultation_fee": Decimal(str(fee)),
                    "phone": f"+919800{10000+i}",
                    "is_available": True,
                    "is_active": True,
                },
            )
            result.append(doc)
            if doc_created: self.stdout.write(f"    + Dr. {first} {last}")
        return result

    def _seed_patients(self):

        from apps.accounts.patients.models import Patient
        self.stdout.write("[-] Seeding patients...")
        result = []
        for i, (uname, email, first, last, dob, gender, blood, phone, ins_prov, ins_num, allergies, chronic, city) in enumerate(PATIENTS, 1):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": uname,
                    "first_name": first,
                    "last_name": last,
                    "role": "patient",
                    "is_active": True,
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()

            patient_id = f"P-{i:04d}"

            # Check if this patient_id is already taken by another user
            existing = Patient.objects.filter(patient_id=patient_id).first()
            if existing and existing.user != user:
                patient_id = f"P-{i:04d}-{user.id}"

            pat, pat_created = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "patient_id": patient_id,
                    "date_of_birth": dob,
                    "gender": gender,
                    "blood_group": blood,
                    "phone": phone,
                    "emergency_contact": f"+91987654{3000+i}",
                    "address": f"{100+i} Health Avenue",
                    "city": city,
                    "state": "Maharashtra",
                    "postal_code": f"40000{i}",
                    "insurance_provider": ins_prov,
                    "insurance_number": ins_num,
                    "allergies": allergies,
                    "chronic_conditions": chronic,
                },
            )
            result.append(pat)
            if pat_created: self.stdout.write(f"    + {first} {last}")
        return result

    def _seed_pharmacists(self):
        self.stdout.write("[-] Seeding pharmacists...")
        for uname, email, first, last, qual in PHARMACISTS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": uname,
                    "first_name": first,
                    "last_name": last,
                    "role": "pharmacist",
                    "is_active": True,
                    "is_staff": True,
                },
            )
            if not created:
                user.username = uname
                user.first_name = first
                user.last_name = last
                user.role = "pharmacist"
                user.is_active = True
                user.is_staff = True
            user.set_password(PASSWORD)
            user.save()
            if created:
                self.stdout.write(f"    + {first} {last}")

    def _seed_lab_technicians(self):
        self.stdout.write("[-] Seeding lab technicians...")
        for uname, email, first, last, qualification in LAB_TECHNICIANS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": uname,
                    "first_name": first,
                    "last_name": last,
                    "role": "lab_technician",
                    "is_active": True,
                    "is_staff": True,
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
                self.stdout.write(f"    + {first} {last}")

    def _seed_providers(self):
        self.stdout.write("[-] Seeding providers...")
        for uname, email, first, last, qualification in PROVIDERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": uname,
                    "first_name": first,
                    "last_name": last,
                    "role": "provider",
                    "is_active": True,
                    "is_staff": True,
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
                self.stdout.write(f"    + {first} {last}")

    def _print_role_summary(self):
        self.stdout.write("[-] RBAC role summary...")
        for role, _ in User.ROLE_CHOICES:
            role_count = User.objects.filter(role=role).count()
            self.stdout.write(f"    {role}: {role_count}")

    def _seed_admin(self):
        self.stdout.write("[-] Seeding admin user...")
        user, created = User.objects.get_or_create(
            email="admin@securemed.com",
            defaults={
                "username": "admin",
                "first_name": "System",
                "last_name": "Admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        if not created:
            user.username = "admin"
            user.first_name = "System"
            user.last_name = "Admin"
            user.role = "admin"
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
        user.set_password(PASSWORD)
        user.save()
        if created:
            self.stdout.write("    + admin@securemed.com")

    def _seed_appointments(self, patients, doctors):
        from apps.scheduling.appointments.models import Appointment
        self.stdout.write("[-] Seeding appointments...")
        result = []
        # Seed 40 appointments for more realistic data
        for _ in range(40):
            attempts = 0
            while attempts < 10:
                pat = random.choice(patients)
                doc = random.choice(doctors)
                days_offset = random.randint(-60, 60)
                appt_date = date.today() + timedelta(days=days_offset)
                appt_time = time(random.randint(9, 16), random.choice([0, 30]))

                status = 'completed' if days_offset < -5 else ('scheduled' if days_offset > 0 else 'in_progress')

                reasons = [
                    "Routine Checkup",
                    "Follow-up Visit",
                    "Annual Physical Exam",
                    "Vaccination",
                    "Symptom Consultation",
                    "Chronic Disease Management",
                    "Lab Report Discussion",
                    "Prescription Renewal",
                    "Health Screening"
                ]

                existing = Appointment.objects.filter(
                    doctor=doc,
                    appointment_date=appt_date,
                    appointment_time=appt_time,
                ).first()
                if existing:
                    attempts += 1
                    continue

                appointment_id = f"APT-{uuid.uuid4().hex[:8].upper()}"
                appt = Appointment.objects.create(
                    appointment_id=appointment_id,
                    patient=pat,
                    doctor=doc,
                    appointment_date=appt_date,
                    appointment_time=appt_time,
                    status=status,
                    reason=random.choice(reasons),
                    created_by=pat.user,
                )
                result.append(appt)
                break
        self.stdout.write(f"    Created {len(result)} appointments")

        # Ensure two spotlight patients have multi-doctor histories.
        if len(patients) >= 2 and len(doctors) >= 2:
            spotlight_patients = patients[:2]
            spotlight_doctors = doctors[:min(3, len(doctors))]
            for p_index, pat in enumerate(spotlight_patients, start=1):
                for d_index, doc in enumerate(spotlight_doctors, start=1):
                    appt_date = date.today() - timedelta(days=10 + (p_index * 2) + d_index)
                    appt_time = time(9 + (d_index % 4), 0)
                    appt_id = f"APT-SPOT-{p_index}{d_index}-{pat.id}-{doc.id}"
                    appt, created = Appointment.objects.get_or_create(
                        appointment_id=appt_id,
                        defaults={
                            "patient": pat,
                            "doctor": doc,
                            "appointment_date": appt_date,
                            "appointment_time": appt_time,
                            "status": "completed",
                            "reason": "Multi-specialist follow-up",
                            "created_by": pat.user,
                        },
                    )
                    if created:
                        result.append(appt)
            self.stdout.write("    Added spotlight multi-doctor appointment history")
        return result

    def _seed_pharmacy_data(self):
        from apps.clinical.pharmacy.models import (
            Drug,
            DrugBatch,
            DrugStock,
            StockTransaction,
        )
        self.stdout.write("[-] Seeding drugs and stock...")
        
        pharmacist = User.objects.filter(role='pharmacist').first() or User.objects.filter(is_superuser=True).first()

        for name, generic, manf, form, strength, price, reorder in DRUGS:
            code = f"DRUG-{name[:3].upper()}-{strength[:2]}"
            drug, created = Drug.objects.get_or_create(
                drug_code=code,
                defaults={
                    "name": name,
                    "generic_name": generic,
                    "manufacturer": manf,
                    "dosage_form": form,
                    "strength": strength,
                    "unit_price": Decimal(str(price)),
                    "reorder_level": reorder,
                    "is_active": True
                }
            )
            
            # Create Stock
            DrugStock.objects.get_or_create(
                drug=drug,
                defaults={"quantity": random.randint(100, 500)}
            )

            # Create Batch
            batch, b_created = DrugBatch.objects.get_or_create(
                batch_number=f"BATCH-{random.randint(1000,9999)}",
                defaults={
                    "drug": drug,
                    "quantity": random.randint(100, 500),
                    "manufacturing_date": date.today() - timedelta(days=random.randint(100, 300)),
                    "expiry_date": date.today() + timedelta(days=random.randint(200, 600)),
                    "supplier": "Medicare Supplies Ltd",
                    "purchase_price": Decimal(str(price * 0.7)), # 30% margin
                    "received_by": pharmacist
                }
            )
            
            if b_created:
                StockTransaction.objects.create(
                    drug=drug,
                    batch=batch,
                    transaction_type='purchase',
                    quantity=batch.quantity,
                    performed_by=pharmacist,
                    notes="Initial stock seed"
                )
                self.stdout.write(f"   + {name}")

    def _seed_medical_records(self, patients, doctors, appointments):
        from apps.clinical.records.models import MedicalRecord
        self.stdout.write("[-] Seeding medical records...")
        result = []
        
        # Enhanced diagnoses with more variety
        enhanced_diagnoses = [
            "Hypertension - Stage 1",
            "Type 2 Diabetes Mellitus",
            "Acute Upper Respiratory Infection",
            "Seasonal Allergic Rhinitis",
            "Migraine with Aura",
            "Gastroesophageal Reflux Disease",
            "Acute Bronchitis",
            "Osteoarthritis - Knee",
            "Generalized Anxiety Disorder",
            "Urinary Tract Infection",
            "Vitamin D Deficiency",
            "Hyperlipidemia",
            "Iron Deficiency Anemia",
            "Acute Gastroenteritis",
            "Mechanical Lower Back Pain",
        ]
        
        detailed_notes = [
            "Patient presents with typical symptoms. Treatment plan discussed and agreed upon. Follow-up in 2 weeks.",
            "Routine follow-up visit. Patient compliant with medication. Vitals stable. Continue current treatment.",
            "Initial consultation. Detailed history taken. Physical examination performed. Treatment initiated.",
            "Follow-up appointment. Symptoms improving with current medication. Lab results reviewed and normal.",
            "Patient recovering well. No adverse reactions to medication. Advised lifestyle modifications.",
            "Comprehensive evaluation completed. All findings discussed with patient. Referral provided if needed.",
            "Regular checkup. Patient education provided regarding diet and exercise. Medication adjusted as needed.",
            "Emergency consultation. Immediate treatment provided. Condition stabilized. Follow-up scheduled.",
        ]
        
        for appt in appointments:
            if appt.status != 'completed': continue
            
            rec, created = MedicalRecord.objects.get_or_create(
                appointment=appt,
                defaults={
                    "record_id": f"REC-{uuid.uuid4().hex[:8].upper()}",
                    "patient": appt.patient,
                    "doctor": appt.doctor,
                    "record_type": "consultation",
                    "record_date": appt.appointment_date,
                    "diagnosis": random.choice(enhanced_diagnoses),
                    "notes": random.choice(detailed_notes),
                    "source": "provider"
                }
            )
            if created: result.append(rec)
        self.stdout.write(f"   Created {len(result)} medical records")
        return result

    def _seed_prescriptions(self, records, doctors):
        from apps.clinical.records.models import PharmacyOrder, Prescription
        self.stdout.write("[-] Seeding prescriptions...")
        count = 0
        for rec in records:
            # Create 1-3 prescriptions per record
            num_prescriptions = random.randint(1, 3)
            for _ in range(num_prescriptions):
                med = random.choice(MEDICATIONS)
                prescription = Prescription.objects.create(
                    medical_record=rec,
                    medication_name=med[0],
                    dosage=med[1],
                    frequency=med[2],
                    duration=med[3],
                    instructions=med[4],
                    status="signed",
                    is_signed=True,
                    signed_by=rec.doctor.user,
                    signed_at=timezone.now() - timedelta(days=random.randint(1, 30))
                )
                
                # Create pharmacy order for signed prescriptions
                if random.choice([True, False]):  # 50% have pharmacy orders
                    PharmacyOrder.objects.create(
                        prescription=prescription,
                        status=random.choice(['pending', 'verified', 'fulfilled']),
                        pickup_code=f"PX-{uuid.uuid4().hex[:8].upper()}"
                    )
                
                count += 1
        self.stdout.write(f"   Created {count} prescriptions with pharmacy orders")

    def _seed_vital_signs(self, patients):
        from apps.clinical.records.models import VitalSign
        self.stdout.write("[-] Seeding vital signs...")
        count = 0
        for pat in patients:
            VitalSign.objects.create(
                patient=pat,
                heart_rate=random.randint(60, 100),
                systolic_bp=random.randint(110, 140),
                diastolic_bp=random.randint(70, 90),
                weight=random.randint(50, 90),
                source="clinical"
            )
            count += 1
        self.stdout.write(f"   Created {count} vital signs")

    def _seed_lab_tests(self):
        from apps.clinical.diagnostics.models import LabTest
        self.stdout.write("[-] Seeding lab tests...")
        result = []
        for name, code, cat, tat, desc in LAB_TESTS:
            lt, created = LabTest.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "category": cat,
                    "turnaround_time": tat,
                    "description": desc,
                    "is_active": True
                }
            )
            if not created and not lt.description:
                lt.description = desc
                lt.save()
            result.append(lt)
        return result

    def _seed_lab_orders(self, patients, doctors, tests):
        from apps.clinical.diagnostics.models import LabOrder, LabResult
        self.stdout.write("[-] Seeding lab orders...")
        counter = 0
        lab_tech = User.objects.filter(role='lab_technician').first()
        
        # Create 15-20 lab orders
        for _ in range(random.randint(15, 20)):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            order_tests = random.sample(tests, random.randint(1, 3))
            
            days_ago = random.randint(1, 30)
            
            order = LabOrder.objects.create(
                patient=pat.user,
                doctor=doc.user,
                priority=random.choice(['routine', 'urgent', 'stat']),
                status=random.choice(['completed', 'processing', 'ordered']),
                clinical_notes=f"Requested as part of {random.choice(['routine checkup', 'follow-up', 'diagnosis'])}"
            )
            order.items.set(order_tests)
            order.created_at = timezone.now() - timedelta(days=days_ago)
            order.save()
            
            # Add results for completed orders
            if order.status == 'completed':
                for test in order_tests:
                    result_values = {
                        'CBC-001': ('13.5 g/dL', '12-16 g/dL', 'g/dL', 'Normal'),
                        'LIP-001': ('180 mg/dL', '<200 mg/dL', 'mg/dL', 'Normal'),
                        'TSH-001': ('2.5 mIU/L', '0.5-5.0 mIU/L', 'mIU/L', 'Normal'),
                        'HBA1C-001': ('5.8%', '<6.0%', '%', 'Normal'),
                        'LFT-001': ('35 U/L', '7-56 U/L', 'U/L', 'Normal'),
                        'KFT-001': ('1.0 mg/dL', '0.7-1.2 mg/dL', 'mg/dL', 'Normal'),
                    }
                    
                    value, ref, unit, flag = result_values.get(test.code, ('Normal', 'Normal', '', 'Normal'))
                    
                    LabResult.objects.create(
                        order=order,
                        test=test,
                        result_value=value,
                        reference_range=ref,
                        units=unit,
                        flag=flag,
                        technician_name=f"{lab_tech.first_name} {lab_tech.last_name}".strip() if lab_tech else "",
                        technician=lab_tech,
                        released_to_patient=True,
                        released_at=timezone.now() - timedelta(days=days_ago-1)
                    )
            
            counter += 1
        
        self.stdout.write(f"    Created {counter} lab orders with results")


    def _seed_conversations_and_messages(self, doctors, patients):
        # Skipped for brevity in this consolidated script, can be added if needed
        pass

    def _seed_referrals(self, patients, doctors, depts):
        # Skipped for brevity
        pass

    def _seed_invoices(self, patients, appointments):
        from apps.finance.billing.models import Invoice, InvoiceItem, Payment
        self.stdout.write("[-] Seeding invoices...")
        invoice_count = 0
        payment_count = 0
        
        for appt in appointments:
            if appt.status != 'completed': continue
            
            # Check if invoice already exists for this appointment
            existing_invoice = Invoice.objects.filter(appointment=appt).first()
            if existing_invoice:
                continue
            
            fee = appt.doctor.consultation_fee
            tax = fee * Decimal("0.18")
            total = fee + tax

            inv = Invoice.objects.create(
                invoice_id=f"INV-{uuid.uuid4().hex[:6].upper()}",
                appointment=appt,
                patient=appt.patient,
                status=random.choice(['paid', 'paid', 'issued']),  # Most are paid
                subtotal=fee,
                tax_amount=tax,
                discount_amount=Decimal(0),
                total_amount=total,
                paid_amount=total if random.choice([True, False]) else Decimal(0),
                due_date=date.today() + timedelta(days=15)
            )
            
            invoice_count += 1
            InvoiceItem.objects.create(
                invoice=inv,
                item_type="consultation",
                description="Consultation Fee",
                quantity=1,
                unit_price=fee,
                total_price=fee
            )
            
            # Create payment for paid invoices
            if inv.status == 'paid':
                Payment.objects.create(
                    payment_id=f"PAY-{uuid.uuid4().hex[:8].upper()}",
                    invoice=inv,
                    amount=total,
                    payment_method=random.choice(['cash', 'card', 'upi', 'insurance']),
                    payment_date=timezone.now() - timedelta(days=random.randint(0, 3)),
                    status='completed',
                    transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
                    notes=f"Payment for appointment on {appt.appointment_date}"
                )
                payment_count += 1
        
        self.stdout.write(f"   Created {invoice_count} invoices and {payment_count} payments")

    def _seed_wellness_tips(self):
        from apps.accounts.patients.models import WellnessTip
        self.stdout.write("[-] Seeding wellness tips...")
        
        # Enhanced wellness tips with more variety
        enhanced_tips = [
            ("Stay Hydrated", "Drink at least 8 glasses of water daily to maintain proper body function and prevent dehydration.", "Nutrition"),
            ("Exercise Regularly", "Aim for at least 30 minutes of moderate physical activity 5 times a week for optimal health.", "Fitness"),
            ("Get Adequate Sleep", "Adults should aim for 7-9 hours of quality sleep each night for better mental and physical health.", "Lifestyle"),
            ("Balanced Diet", "Include a variety of fruits, vegetables, whole grains, and lean proteins in your daily meals.", "Nutrition"),
            ("Manage Stress", "Practice mindfulness, meditation, or yoga to reduce stress and improve mental well-being.", "Mental Health"),
            ("Regular Health Checkups", "Schedule annual health screenings and checkups to catch potential issues early.", "Prevention"),
            ("Limit Screen Time", "Take regular breaks from screens every 20-30 minutes to reduce eye strain and improve posture.", "Lifestyle"),
            ("Maintain Healthy Weight", "Achieve and maintain a healthy BMI through balanced diet and regular exercise.", "Fitness"),
            ("Quit Smoking", "Smoking increases risk of numerous diseases. Seek support to quit for better health outcomes.", "Prevention"),
            ("Limit Alcohol Intake", "If you drink, do so in moderation - up to 1 drink per day for women, 2 for men.", "Lifestyle"),
            ("Practice Good Hygiene", "Wash hands frequently, especially before meals and after using the restroom.", "Prevention"),
            ("Stay Socially Connected", "Maintain healthy relationships and social connections for better mental health.", "Mental Health"),
        ]
        
        for title, desc, cat in enhanced_tips:
            WellnessTip.objects.get_or_create(
                title=title,
                defaults={"description": desc, "category": cat, "is_active": True}
            )
        
        self.stdout.write(f"   Created {len(enhanced_tips)} wellness tips")

    def _seed_showcase_patient(self, patients, doctors, depts, lab_tests):
        from apps.accounts.patients.models import Patient
        from apps.clinical.diagnostics.models import LabOrder, LabResult
        from apps.clinical.records.models import (
            MedicalRecord,
            PharmacyOrder,
            Prescription,
            VitalSign,
        )
        from apps.finance.billing.models import Invoice, InvoiceItem, Payment
        from apps.scheduling.appointments.models import Appointment, Referral

        target = next((p for p in patients if p.user.email == "rahul.verma@example.com"), None)
        if not target:
            target = Patient.objects.select_related("user").filter(user__email="rahul.verma@example.com").first()
        if not target:
            self.stdout.write("    ! Rahul Verma not found, skipping showcase seed.")
            return

        spotlight_doctors = doctors[:3] if doctors else []
        if len(spotlight_doctors) < 2:
            spotlight_doctors = doctors
        if not spotlight_doctors:
            self.stdout.write("    ! No doctors available for Rahul showcase seed.")
            return

        def ensure_appointment(appt_id, doctor, appt_date, appt_time, status, reason):
            appt, _ = Appointment.objects.get_or_create(
                appointment_id=appt_id,
                defaults={
                    "patient": target,
                    "doctor": doctor,
                    "appointment_date": appt_date,
                    "appointment_time": appt_time,
                    "status": status,
                    "reason": reason,
                    "created_by": target.user,
                },
            )
            return appt

        def ensure_record(appt, diagnosis, notes):
            rec, _ = MedicalRecord.objects.get_or_create(
                appointment=appt,
                defaults={
                    "record_id": f"REC-RV-{appt.appointment_id[-6:]}",
                    "patient": target,
                    "doctor": appt.doctor,
                    "record_type": "consultation",
                    "record_date": appt.appointment_date,
                    "diagnosis": diagnosis,
                    "notes": notes,
                    "source": "provider",
                },
            )
            return rec

        def ensure_prescriptions(record):
            for med in MEDICATIONS[:2]:
                if Prescription.objects.filter(medical_record=record, medication_name=med[0]).exists():
                    continue
                prescription = Prescription.objects.create(
                    medical_record=record,
                    medication_name=med[0],
                    dosage=med[1],
                    frequency=med[2],
                    duration=med[3],
                    instructions=med[4],
                    status="signed",
                    is_signed=True,
                    signed_by=record.doctor.user,
                    signed_at=timezone.now() - timedelta(days=3),
                )
                PharmacyOrder.objects.get_or_create(
                    prescription=prescription,
                    defaults={
                        "status": "verified",
                        "pickup_code": f"PX-RV-{uuid.uuid4().hex[:6].upper()}",
                    },
                )

        def ensure_lab_order(appt, tests):
            existing = LabOrder.objects.filter(patient=target.user, appointment=appt).first()
            if existing:
                return existing
            order = LabOrder.objects.create(
                patient=target.user,
                doctor=appt.doctor.user,
                appointment=appt,
                priority="routine",
                status="completed",
                clinical_notes="Showcase lab panel for patient dashboard.",
            )
            order.items.set(tests)
            order.created_at = timezone.now() - timedelta(days=5)
            order.save()
            for test in tests:
                if LabResult.objects.filter(order=order, test=test).exists():
                    continue
                LabResult.objects.create(
                    order=order,
                    test=test,
                    result_value="Normal",
                    reference_range="Normal",
                    units="",
                    flag="Normal",
                    technician_name="Neha Sharma",
                    released_to_patient=True,
                    released_at=timezone.now() - timedelta(days=4),
                )
            return order

        def ensure_invoice(appt):
            if Invoice.objects.filter(appointment=appt).exists():
                return
            fee = appt.doctor.consultation_fee
            tax = fee * Decimal("0.18")
            total = fee + tax
            inv = Invoice.objects.create(
                invoice_id=f"INV-RV-{uuid.uuid4().hex[:6].upper()}",
                appointment=appt,
                patient=target,
                status="paid",
                subtotal=fee,
                tax_amount=tax,
                discount_amount=Decimal(0),
                total_amount=total,
                paid_amount=total,
                due_date=date.today() + timedelta(days=10),
            )
            InvoiceItem.objects.create(
                invoice=inv,
                item_type="consultation",
                description="Consultation Fee",
                quantity=1,
                unit_price=fee,
                total_price=fee,
            )
            Payment.objects.create(
                payment_id=f"PAY-RV-{uuid.uuid4().hex[:8].upper()}",
                invoice=inv,
                amount=total,
                payment_method="upi",
                payment_date=timezone.now() - timedelta(days=2),
                status="completed",
                transaction_id=f"TXN-RV-{uuid.uuid4().hex[:10].upper()}",
                notes="Showcase patient billing payment.",
            )

        # Ensure vitals exist for Rahul (additional reading)
        if not VitalSign.objects.filter(patient=target).exists():
            VitalSign.objects.create(
                patient=target,
                heart_rate=78,
                systolic_bp=126,
                diastolic_bp=82,
                weight=74,
                source="clinical",
            )

        # Appointments & records
        today = date.today()
        appt1 = ensure_appointment("APT-RV-0001", spotlight_doctors[0], today - timedelta(days=12), time(10, 0), "completed", "Hypertension follow-up")
        appt2 = ensure_appointment("APT-RV-0002", spotlight_doctors[min(1, len(spotlight_doctors)-1)], today - timedelta(days=6), time(11, 30), "completed", "Medication review")
        appt3 = ensure_appointment("APT-RV-0003", spotlight_doctors[0], today + timedelta(days=7), time(15, 0), "scheduled", "Routine checkup")

        rec1 = ensure_record(appt1, "Hypertension - Stage 1", "BP control plan reviewed; adjusted antihypertensive dosing.")
        rec2 = ensure_record(appt2, "Hyperlipidemia", "Discussed lipid panel; advised diet changes and statin adherence.")
        ensure_prescriptions(rec1)
        ensure_prescriptions(rec2)

        # Labs
        tests = lab_tests[:2] if lab_tests else []
        if tests:
            ensure_lab_order(appt1, tests)

        # Referral
        if len(spotlight_doctors) >= 2:
            referral_id = "REF-RV-0001"
            if not Referral.objects.filter(referral_id=referral_id).exists():
                dept = next(iter(depts.values()), None) if isinstance(depts, dict) else (depts[0] if depts else None)
                Referral.objects.create(
                    referral_id=referral_id,
                    patient=target,
                    referring_doctor=spotlight_doctors[0],
                    specialist=spotlight_doctors[1],
                    department=dept,
                    status="accepted",
                    priority="routine",
                    reason="Cardiology follow-up for hypertension management.",
                    clinical_notes="Patient showing improved BP; recommend specialist review.",
                    access_granted=True,
                    access_expires_at=timezone.now() + timedelta(days=30),
                    completed_at=timezone.now() - timedelta(days=1),
                )

        # Billing for completed appointments
        ensure_invoice(appt1)
        ensure_invoice(appt2)
