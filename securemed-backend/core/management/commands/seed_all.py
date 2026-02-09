"""
Comprehensive database seeding for SecureMed.
Creates departments, doctors, patients, appointments, medical records,
prescriptions, vital signs, lab orders, conversations, messages, referrals,
and invoices with realistic data.

Run with:  python manage.py seed_all
Reset:     python manage.py seed_all --flush
"""
import random
import uuid
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()

# ---------------------------------------------------------------------------
# Static seed data
# ---------------------------------------------------------------------------

DEPARTMENTS = [
    ("Cardiology", "CARD", "Heart and cardiovascular care", 2, "Main Building"),
    ("Neurology", "NEURO", "Brain and nervous system care", 3, "Main Building"),
    ("Pediatrics", "PEDIA", "Child healthcare services", 1, "East Wing"),
    ("Orthopedics", "ORTHO", "Bone, joint, and muscle care", 2, "Main Building"),
    ("Dermatology", "DERMA", "Skin, hair, and nail care", 1, "West Wing"),
    ("General Medicine", "GENMED", "Primary care and general consultation", 1, "Main Building"),
    ("Psychiatry", "PSYCH", "Mental health services", 4, "North Wing"),
    ("Radiology", "RAD", "Diagnostic imaging", 0, "Basement Block"),
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
    ("john.doe", "john.doe@example.com", "John", "Doe", "1985-03-15", "M", "O+", "+919876500001", "Fortis Health Shield", "FH-990001", "Penicillin", "Hypertension", "Mumbai"),
    ("jane.smith", "jane.smith@example.com", "Jane", "Smith", "1990-07-22", "F", "A+", "+919876500002", "Apollo Health Plus", "AH-110002", "", "Asthma", "Delhi"),
    ("robert.johnson", "robert.j@example.com", "Robert", "Johnson", "1978-11-30", "M", "B+", "+919876500003", "Max Bupa", "MB-550003", "Sulfa drugs", "Diabetes Type 2", "Bangalore"),
    ("emily.williams", "emily.w@example.com", "Emily", "Williams", "1995-05-18", "F", "AB-", "+919876500004", "Star Health", "SH-990004", "", "", "Hyderabad"),
    ("michael.brown", "michael.b@example.com", "Michael", "Brown", "1982-09-25", "M", "A-", "+919876500005", "HDFC Ergo", "HE-330005", "Aspirin", "Arthritis, High Cholesterol", "Chennai"),
    ("sarah.davis", "sarah.d@example.com", "Sarah", "Davis", "1988-12-10", "F", "O-", "+919876500006", "ICICI Lombard", "IL-770006", "", "Migraine", "Pune"),
    ("amit.sharma", "amit.s@example.com", "Amit", "Sharma", "1972-01-05", "M", "B-", "+919876500007", "Bajaj Allianz", "BA-440007", "Latex", "COPD", "Kolkata"),
    ("priya.nair", "priya.n@example.com", "Priya", "Nair", "2000-08-14", "F", "AB+", "+919876500008", "Fortis Health Shield", "FH-220008", "", "", "Kochi"),
]

DIAGNOSES = [
    "Essential Hypertension",
    "Type 2 Diabetes Mellitus",
    "Acute Upper Respiratory Infection",
    "Chronic Migraine",
    "Osteoarthritis of Knee",
    "Allergic Contact Dermatitis",
    "Generalized Anxiety Disorder",
    "Iron Deficiency Anemia",
    "Lumbar Spondylosis",
    "Viral Gastroenteritis",
    "Bronchial Asthma – Mild Persistent",
    "Hypothyroidism",
]

MEDICATIONS = [
    # (name, dosage, frequency, duration, instructions)
    ("Amlodipine", "5 mg", "Once daily in the morning", "90 days", "Take on an empty stomach. Monitor blood pressure regularly."),
    ("Metformin", "500 mg", "Twice daily with meals", "90 days", "Take with breakfast and dinner. Avoid alcohol."),
    ("Atorvastatin", "20 mg", "Once daily at bedtime", "90 days", "Take at night. Report any unexplained muscle pain."),
    ("Omeprazole", "20 mg", "Once daily before breakfast", "30 days", "Swallow whole, do not crush. Take 30 min before food."),
    ("Azithromycin", "500 mg", "Once daily for 3 days", "3 days", "Complete the full course even if symptoms improve."),
    ("Cetirizine", "10 mg", "Once daily at bedtime", "14 days", "May cause drowsiness. Avoid driving if affected."),
    ("Ibuprofen", "400 mg", "Three times daily after meals", "7 days", "Take after food. Do not exceed recommended dose."),
    ("Levothyroxine", "50 mcg", "Once daily on empty stomach", "180 days", "Take 30 min before breakfast. Avoid calcium supplements within 4 hrs."),
    ("Montelukast", "10 mg", "Once daily at bedtime", "30 days", "For asthma maintenance. Continue even when symptom-free."),
    ("Sertraline", "50 mg", "Once daily in the morning", "90 days", "Takes 2-4 weeks for full effect. Do not stop abruptly."),
    ("Paracetamol", "650 mg", "Up to three times daily as needed", "5 days", "Do not exceed 3 tablets in 24 hours."),
    ("Diclofenac Gel", "1% topical", "Apply to affected area twice daily", "14 days", "For external use only. Wash hands after application."),
]

LAB_TESTS = [
    # (name, code, category, turnaround)
    ("Complete Blood Count", "CBC-001", "Hematology", "4 hours"),
    ("Lipid Profile", "LIP-001", "Chemistry", "6 hours"),
    ("Thyroid Stimulating Hormone", "TSH-001", "Endocrine", "8 hours"),
    ("Hemoglobin A1c", "HBA1C-001", "Hematology", "24 hours"),
    ("Liver Function Test", "LFT-001", "Chemistry", "6 hours"),
    ("Kidney Function Test", "KFT-001", "Chemistry", "6 hours"),
    ("Urinalysis", "UA-001", "Urinalysis", "2 hours"),
    ("Chest X-Ray", "CXR-001", "Other", "1 hour"),
    ("ECG", "ECG-001", "Other", "30 minutes"),
    ("Blood Glucose Fasting", "BGF-001", "Chemistry", "4 hours"),
]

WELLNESS_TIPS = [
    ("Stay Hydrated", "Drink at least 8 glasses (2 litres) of water every day to support kidney function and overall health.", "hydration"),
    ("Walk 10,000 Steps", "Aim for 10,000 steps daily. Even a brisk 30-minute walk counts toward heart health.", "exercise"),
    ("Sleep 7-8 Hours", "Adults need 7-8 hours of quality sleep. Maintain a consistent sleep schedule.", "sleep"),
    ("Eat More Greens", "Include leafy greens like spinach, kale, and broccoli in your daily diet for vital nutrients.", "nutrition"),
    ("Practice Mindfulness", "Spend 10 minutes daily on deep breathing or meditation to reduce stress and anxiety.", "mental"),
    ("Limit Screen Time", "Take a 5-minute break from screens every 30 minutes to reduce eye strain.", "general"),
    ("Monitor Blood Pressure", "Check your blood pressure at least once a month, especially if you have a family history of hypertension.", "general"),
    ("Stretch Daily", "Simple stretching for 10 minutes each morning improves flexibility and reduces injury risk.", "exercise"),
]

PASSWORD = "SecureMed@123"


class Command(BaseCommand):
    help = "Seed the entire SecureMed database with realistic data"

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete ALL existing seed data before re-seeding")

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        self.stdout.write(self.style.WARNING("\n══════════════════════════════════════"))
        self.stdout.write(self.style.WARNING("  SecureMed – Full Database Seed"))
        self.stdout.write(self.style.WARNING("══════════════════════════════════════\n"))

        depts = self._seed_departments()
        doctors = self._seed_doctors(depts)
        patients = self._seed_patients()
        self._seed_admin()
        appointments = self._seed_appointments(patients, doctors)
        records = self._seed_medical_records(patients, doctors, appointments)
        self._seed_prescriptions(records, doctors)
        self._seed_vital_signs(patients)
        lab_tests = self._seed_lab_tests()
        self._seed_lab_orders(patients, doctors, lab_tests)
        self._seed_conversations_and_messages(doctors, patients)
        self._seed_referrals(patients, doctors, depts)
        self._seed_invoices(patients, appointments)
        self._seed_wellness_tips()

        self.stdout.write(self.style.SUCCESS("\n✅  Seeding complete!"))
        self.stdout.write(self.style.SUCCESS(f"   Password for all users: {PASSWORD}\n"))

    # ------------------------------------------------------------------
    # FLUSH
    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write(self.style.WARNING("Flushing existing seed data …"))
        from appointments.models import Appointment, Referral
        from billing.models import Invoice, InvoiceItem, Payment
        from labs.models import LabOrder, LabResult, LabTest as LabsCatalog
        from medical_records.models import (
            EmergencyAccessLog, LabTest as MRLabTest, MedicalRecord,
            MedicalRecordAccess, Prescription, VitalSign,
        )
        from patients.models import Patient, WellnessTip
        from telemedicine.models import Conversation, Message, VideoRoom

        Message.objects.all().delete()
        Conversation.objects.all().delete()
        VideoRoom.objects.all().delete()
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

        from departments.models import Doctor, Department
        Doctor.objects.all().delete()
        Department.objects.all().delete()

        # Delete non-superuser users
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write("  Flush done.\n")

    # ------------------------------------------------------------------
    # Departments
    # ------------------------------------------------------------------
    def _seed_departments(self):
        from departments.models import Department

        self.stdout.write("🏥  Seeding departments …")
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
            if created:
                self.stdout.write(f"   + {name}")
        return result

    # ------------------------------------------------------------------
    # Doctors
    # ------------------------------------------------------------------
    def _seed_doctors(self, depts):
        from departments.models import Doctor

        self.stdout.write("👨‍⚕️  Seeding doctors …")
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

            doc, doc_created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "doctor_id": f"DOC-{i:04d}",
                    "specialization": spec,
                    "department": depts.get(dept_name),
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
            if doc_created:
                self.stdout.write(f"   + Dr. {first} {last} ({spec})")
        return result

    # ------------------------------------------------------------------
    # Patients
    # ------------------------------------------------------------------
    def _seed_patients(self):
        from patients.models import Patient

        self.stdout.write("🧑‍🤝‍🧑  Seeding patients …")
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

            pat, pat_created = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "patient_id": f"P-{i:04d}",
                    "date_of_birth": dob,
                    "gender": gender,
                    "blood_group": blood,
                    "phone": phone,
                    "emergency_contact": f"+91987654{3000+i}",
                    "address": f"{100+i} Health Avenue",
                    "city": city,
                    "state": "Maharashtra" if city == "Mumbai" else "Karnataka" if city == "Bangalore" else "Tamil Nadu" if city == "Chennai" else "Delhi" if city == "Delhi" else "Telangana" if city == "Hyderabad" else "Maharashtra" if city == "Pune" else "West Bengal" if city == "Kolkata" else "Kerala",
                    "postal_code": f"{400000+i}",
                    "insurance_provider": ins_prov,
                    "insurance_number": ins_num,
                    "allergies": allergies,
                    "chronic_conditions": chronic,
                },
            )
            result.append(pat)
            if pat_created:
                self.stdout.write(f"   + {first} {last} (P-{i:04d})")
        return result

    # ------------------------------------------------------------------
    # Admin user
    # ------------------------------------------------------------------
    def _seed_admin(self):
        self.stdout.write("🔑  Seeding admin user …")
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
        if created:
            user.set_password(PASSWORD)
            user.save()
            self.stdout.write("   + admin@securemed.com")

    # ------------------------------------------------------------------
    # Appointments
    # ------------------------------------------------------------------
    def _seed_appointments(self, patients, doctors):
        from appointments.models import Appointment

        self.stdout.write("📅  Seeding appointments …")
        result = []
        reasons = [
            "Routine health checkup",
            "Follow-up visit",
            "Persistent headache evaluation",
            "Chest pain assessment",
            "Joint pain consultation",
            "Skin rash examination",
            "Blood pressure monitoring",
            "Diabetes management review",
            "Anxiety and sleep issues",
            "Post-surgery follow-up",
        ]

        appt_times = [
            time(9, 0), time(9, 30), time(10, 0), time(10, 30),
            time(11, 0), time(11, 30), time(14, 0), time(14, 30),
            time(15, 0), time(15, 30), time(16, 0),
        ]

        counter = 1
        # Past appointments (completed / cancelled)
        for _ in range(12):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            days_ago = random.randint(5, 120)
            appt_date = date.today() - timedelta(days=days_ago)
            appt_time = random.choice(appt_times)
            status = random.choices(["completed", "cancelled", "no_show"], weights=[7, 2, 1])[0]

            appt_id = f"APT-{counter:05d}"
            if Appointment.objects.filter(appointment_id=appt_id).exists():
                counter += 1
                continue
            try:
                appt = Appointment.objects.create(
                    appointment_id=appt_id,
                    patient=pat,
                    doctor=doc,
                    appointment_date=appt_date,
                    appointment_time=appt_time,
                    status=status,
                    reason=random.choice(reasons),
                    notes=f"{'Follow-up needed.' if status == 'completed' else ''}",
                    created_by=pat.user,
                )
                result.append(appt)
                counter += 1
            except Exception:
                counter += 1

        # Upcoming appointments (scheduled / confirmed / in_progress)
        for _ in range(10):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            days_ahead = random.randint(0, 30)
            appt_date = date.today() + timedelta(days=days_ahead)
            appt_time = random.choice(appt_times)
            status = random.choices(["scheduled", "confirmed", "in_progress"], weights=[5, 3, 2])[0]
            # Only today's appointments can be in_progress
            if days_ahead > 0:
                status = random.choice(["scheduled", "confirmed"])

            appt_id = f"APT-{counter:05d}"
            if Appointment.objects.filter(appointment_id=appt_id).exists():
                counter += 1
                continue
            try:
                appt = Appointment.objects.create(
                    appointment_id=appt_id,
                    patient=pat,
                    doctor=doc,
                    appointment_date=appt_date,
                    appointment_time=appt_time,
                    status=status,
                    reason=random.choice(reasons),
                    created_by=pat.user,
                )
                result.append(appt)
                counter += 1
            except Exception:
                counter += 1

        self.stdout.write(f"   Created {len(result)} appointments")
        return result

    # ------------------------------------------------------------------
    # Medical Records
    # ------------------------------------------------------------------
    def _seed_medical_records(self, patients, doctors, appointments):
        from medical_records.models import MedicalRecord

        self.stdout.write("📋  Seeding medical records …")
        result = []
        completed_appts = [a for a in appointments if a.status == "completed"]

        # Records tied to completed appointments
        for appt in completed_appts:
            rec_id = f"REC-{uuid.uuid4().hex[:8].upper()}"
            rec = MedicalRecord.objects.create(
                record_id=rec_id,
                patient=appt.patient,
                doctor=appt.doctor,
                appointment=appt,
                record_type="consultation",
                record_date=appt.appointment_date,
                diagnosis=random.choice(DIAGNOSES),
                symptoms=random.choice([
                    "Headache, fatigue, dizziness",
                    "Chest tightness, shortness of breath",
                    "Joint pain, morning stiffness",
                    "Persistent cough, runny nose",
                    "Skin rash, itching",
                    "Abdominal pain, nausea",
                    "Anxiety, insomnia",
                    "Elevated blood sugar readings",
                ]),
                treatment=random.choice([
                    "Medication prescribed. Lifestyle modifications advised.",
                    "Referral to specialist. Continue current medications.",
                    "Physical therapy recommended. Anti-inflammatory medication started.",
                    "Lab tests ordered. Follow-up in 2 weeks.",
                    "Topical treatment prescribed. Avoid known allergens.",
                    "Dietary changes recommended. New medication started.",
                ]),
                notes=f"Consultation by Dr. {appt.doctor.user.last_name}. "
                       f"Patient advised to follow up in {random.choice([1,2,4])} week(s).",
                source="provider",
                is_attested=True,
                attested_by=appt.doctor,
                attested_at=timezone.now() - timedelta(days=random.randint(1, 60)),
            )
            result.append(rec)

        # Additional standalone records
        for _ in range(6):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            rec_type = random.choice(["lab_report", "imaging", "consultation"])
            rec_date = date.today() - timedelta(days=random.randint(30, 365))
            rec = MedicalRecord.objects.create(
                record_id=f"REC-{uuid.uuid4().hex[:8].upper()}",
                patient=pat,
                doctor=doc,
                record_type=rec_type,
                record_date=rec_date,
                diagnosis=random.choice(DIAGNOSES),
                notes=f"{rec_type.replace('_', ' ').title()} recorded by Dr. {doc.user.last_name}.",
                source="provider",
            )
            result.append(rec)

        self.stdout.write(f"   Created {len(result)} medical records")
        return result

    # ------------------------------------------------------------------
    # Prescriptions
    # ------------------------------------------------------------------
    def _seed_prescriptions(self, records, doctors):
        from medical_records.models import Prescription

        self.stdout.write("💊  Seeding prescriptions …")
        count = 0
        for rec in records:
            # 1-3 prescriptions per consultation record
            if rec.record_type != "consultation":
                continue
            num_rx = random.randint(1, 3)
            chosen_meds = random.sample(MEDICATIONS, min(num_rx, len(MEDICATIONS)))
            for med_name, dosage, frequency, duration, instructions in chosen_meds:
                is_signed = random.random() < 0.8  # 80 % signed
                signing_doc = rec.doctor.user if rec.doctor else random.choice(doctors).user
                rx = Prescription.objects.create(
                    medical_record=rec,
                    medication_name=med_name,
                    dosage=dosage,
                    frequency=frequency,
                    duration=duration,
                    instructions=instructions,
                    status="signed" if is_signed else "draft",
                    is_signed=is_signed,
                    signed_by=signing_doc if is_signed else None,
                    signed_at=timezone.now() - timedelta(days=random.randint(0, 30)) if is_signed else None,
                )
                if is_signed:
                    rx.signature_hash = rx.generate_signature_hash()
                    rx.save(update_fields=["signature_hash"])
                count += 1

        self.stdout.write(f"   Created {count} prescriptions")

    # ------------------------------------------------------------------
    # Vital Signs
    # ------------------------------------------------------------------
    def _seed_vital_signs(self, patients):
        from medical_records.models import VitalSign

        self.stdout.write("❤️  Seeding vital signs …")
        count = 0
        for pat in patients:
            # 3-6 historical vitals per patient
            for _ in range(random.randint(3, 6)):
                VitalSign.objects.create(
                    patient=pat,
                    heart_rate=random.randint(60, 100),
                    systolic_bp=random.randint(110, 150),
                    diastolic_bp=random.randint(65, 95),
                    weight=round(random.uniform(50.0, 100.0), 1),
                    source=random.choice(["clinical", "patient", "device"]),
                    is_verified=True,
                )
                count += 1
        self.stdout.write(f"   Created {count} vital sign entries")

    # ------------------------------------------------------------------
    # Lab Tests (catalog) and Lab Orders
    # ------------------------------------------------------------------
    def _seed_lab_tests(self):
        from labs.models import LabTest

        self.stdout.write("🧪  Seeding lab test catalog …")
        result = []
        for name, code, category, tat in LAB_TESTS:
            lt, created = LabTest.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "category": category if category in dict(LabTest.CATEGORY_CHOICES) else "Other",
                    "description": f"Standard {name} test",
                    "turnaround_time": tat,
                    "is_active": True,
                },
            )
            result.append(lt)
            if created:
                self.stdout.write(f"   + {name}")
        return result

    def _seed_lab_orders(self, patients, doctors, lab_tests):
        from labs.models import LabOrder, LabResult

        self.stdout.write("🔬  Seeding lab orders …")
        count = 0
        for _ in range(10):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            status = random.choice(["pending", "processing", "completed"])
            order = LabOrder.objects.create(
                patient=pat.user,
                doctor=doc.user,
                priority=random.choice(["routine", "urgent"]),
                status=status,
                clinical_notes=f"Ordered by Dr. {doc.user.last_name} for routine monitoring.",
                fasting_required=random.choice([True, False]),
            )
            # Add 1-3 tests to the order
            chosen_tests = random.sample(lab_tests, min(random.randint(1, 3), len(lab_tests)))
            order.items.set(chosen_tests)

            # Add results for completed orders
            if status == "completed":
                for test in chosen_tests:
                    LabResult.objects.create(
                        order=order,
                        test=test,
                        result_value=str(round(random.uniform(1.0, 200.0), 2)),
                        reference_range="Normal range varies",
                        units="mg/dL" if "Chemistry" in test.category else "count/µL" if "Hematology" in test.category else "",
                        flag=random.choice(["", "", "", "High", "Low"]),
                        notes="",
                        technician_name=random.choice(["Lab Tech A. Rao", "Lab Tech S. Mehta", "Lab Tech D. Nair"]),
                    )
            count += 1
        self.stdout.write(f"   Created {count} lab orders")

    # ------------------------------------------------------------------
    # Conversations & Messages
    # ------------------------------------------------------------------
    def _seed_conversations_and_messages(self, doctors, patients):
        from telemedicine.models import Conversation, Message

        self.stdout.write("💬  Seeding conversations & messages …")
        conv_count = 0
        msg_count = 0

        # Create conversations between doctors and patients
        pairs = []
        for _ in range(6):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            pairs.append((pat, doc))

        for pat, doc in pairs:
            # Check if conversation already exists between these two
            existing = Conversation.objects.filter(
                participants=pat.user
            ).filter(participants=doc.user).first()

            if existing:
                conv = existing
            else:
                conv = Conversation.objects.create(is_active=True)
                conv.participants.add(pat.user, doc.user)
                conv_count += 1

            # Seed a few messages
            greetings = [
                (pat.user, f"Hello Dr. {doc.user.last_name}, I wanted to discuss my recent test results."),
                (doc.user, f"Hello {pat.user.first_name}, of course! I have reviewed your results. They look mostly normal."),
                (pat.user, "That's great to hear! Any recommendations for follow-up?"),
                (doc.user, f"I'd suggest we schedule a follow-up in 2 weeks. Also, please continue your current medications."),
                (pat.user, "Will do. Thank you, Doctor!"),
                (doc.user, "You're welcome. Don't hesitate to reach out if you have any concerns."),
            ]
            for j, (sender, content) in enumerate(greetings):
                Message.objects.create(
                    conversation=conv,
                    sender=sender,
                    content=content,
                    is_read=j < len(greetings) - 1,  # last message unread
                )
                msg_count += 1

        # Also a doctor-to-doctor conversation
        if len(doctors) >= 2:
            doc1, doc2 = doctors[0], doctors[1]
            conv = Conversation.objects.create(is_active=True)
            conv.participants.add(doc1.user, doc2.user)
            conv_count += 1
            d2d_msgs = [
                (doc1.user, f"Hi Dr. {doc2.user.last_name}, I have a patient I'd like to discuss with you regarding a complex cardiac case."),
                (doc2.user, f"Sure Dr. {doc1.user.last_name}, happy to consult. Can you share the patient details?"),
                (doc1.user, "Patient is a 45-year-old male with recurring chest pain. ECG shows ST-segment changes. I'll send the full report."),
                (doc2.user, "That sounds concerning. Let's schedule a joint review. I'm available Thursday morning."),
            ]
            for j, (sender, content) in enumerate(d2d_msgs):
                Message.objects.create(
                    conversation=conv,
                    sender=sender,
                    content=content,
                    is_read=True,
                )
                msg_count += 1

        self.stdout.write(f"   Created {conv_count} conversations, {msg_count} messages")

    # ------------------------------------------------------------------
    # Referrals
    # ------------------------------------------------------------------
    def _seed_referrals(self, patients, doctors, depts):
        from appointments.models import Referral

        self.stdout.write("🔀  Seeding referrals …")
        count = 0
        referral_reasons = [
            "Patient requires specialist evaluation for persistent symptoms.",
            "Abnormal lab results requiring further investigation.",
            "Post-operative follow-up with specialist.",
            "Second opinion requested for treatment plan.",
            "Chronic condition management by specialist.",
        ]

        for _ in range(5):
            pat = random.choice(patients)
            referring = random.choice(doctors)
            specialist = random.choice([d for d in doctors if d != referring])
            dept = specialist.department

            ref_id = f"REF-{uuid.uuid4().hex[:6].upper()}"
            status = random.choice(["pending", "accepted", "completed"])
            ref = Referral.objects.create(
                referral_id=ref_id,
                patient=pat,
                referring_doctor=referring,
                specialist=specialist,
                department=dept,
                status=status,
                priority=random.choice(["routine", "urgent"]),
                reason=random.choice(referral_reasons),
                clinical_notes=f"Referred by Dr. {referring.user.last_name}. "
                               f"Patient has {random.choice(DIAGNOSES)}.",
                access_granted=status in ("accepted", "completed"),
                access_expires_at=timezone.now() + timedelta(days=30) if status == "accepted" else None,
                completed_at=timezone.now() - timedelta(days=random.randint(1, 15)) if status == "completed" else None,
            )
            count += 1

        self.stdout.write(f"   Created {count} referrals")

    # ------------------------------------------------------------------
    # Invoices
    # ------------------------------------------------------------------
    def _seed_invoices(self, patients, appointments):
        from billing.models import Invoice, InvoiceItem, Payment

        self.stdout.write("💰  Seeding invoices & payments …")
        completed = [a for a in appointments if a.status == "completed"]
        inv_count = 0

        for appt in completed[:8]:
            fee = int(appt.doctor.consultation_fee)
            tax = int(fee * 0.18)
            total = fee + tax
            inv_id = f"INV-{uuid.uuid4().hex[:6].upper()}"
            status = random.choice(["issued", "paid", "paid"])

            inv = Invoice.objects.create(
                invoice_id=inv_id,
                patient=appt.patient,
                appointment=appt,
                due_date=date.today() + timedelta(days=30),
                status=status,
                subtotal=Decimal(str(fee)),
                tax_amount=Decimal(str(tax)),
                discount_amount=Decimal("0"),
                total_amount=Decimal(str(total)),
                paid_amount=Decimal(str(total)) if status == "paid" else Decimal("0"),
            )
            InvoiceItem.objects.create(
                invoice=inv,
                item_type="consultation",
                description=f"Consultation with Dr. {appt.doctor.user.last_name} ({appt.doctor.specialization})",
                quantity=1,
                unit_price=Decimal(str(fee)),
                total_price=Decimal(str(fee)),
            )
            if status == "paid":
                Payment.objects.create(
                    payment_id=f"PAY-{uuid.uuid4().hex[:6].upper()}",
                    invoice=inv,
                    amount=Decimal(str(total)),
                    payment_method=random.choice(["card", "upi", "net_banking"]),
                    status="completed",
                    transaction_id=f"TXN-{uuid.uuid4().hex[:10].upper()}",
                )
            inv_count += 1

        self.stdout.write(f"   Created {inv_count} invoices")

    # ------------------------------------------------------------------
    # Wellness Tips
    # ------------------------------------------------------------------
    def _seed_wellness_tips(self):
        from patients.models import WellnessTip

        self.stdout.write("🌿  Seeding wellness tips …")
        count = 0
        for title, desc, cat in WELLNESS_TIPS:
            _, created = WellnessTip.objects.get_or_create(
                title=title,
                defaults={"description": desc, "category": cat, "is_active": True},
            )
            if created:
                count += 1
        self.stdout.write(f"   Created {count} wellness tips")
