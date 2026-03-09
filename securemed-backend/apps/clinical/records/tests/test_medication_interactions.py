from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.patients.models import Patient
from apps.clinical.pharmacy.models import Drug
from apps.clinical.records.interaction_service import evaluate_medication_safety, generate_and_store_report
from apps.clinical.records.tasks import generate_interaction_report_job
from apps.clinical.records.models import (
    MedicalRecord,
    MedicationInteractionKnowledge,
    MedicationInteractionReportJob,
    MedicationSideEffect,
    Prescription,
)
from apps.scheduling.availability.models import Department, Doctor

User = get_user_model()


class MedicationInteractionServiceTests(TestCase):
    def test_evaluate_medication_safety_includes_single_and_triplet_findings(self):
        MedicationSideEffect.objects.create(
            medication_name="aspirin",
            side_effect="Nausea",
            severity="low",
            description="Can cause nausea in some patients.",
            source="HODDI",
            source_version="v1",
        )
        MedicationInteractionKnowledge.objects.create(
            combination_signature="aspirin|ibuprofen|warfarin",
            medications=["aspirin", "ibuprofen", "warfarin"],
            combination_size=3,
            side_effect="Bleeding risk",
            severity="critical",
            description="Combined regimen significantly increases bleeding risk.",
            source="HODDI",
            source_version="v1",
        )

        result = evaluate_medication_safety(["Aspirin", "Warfarin", "Ibuprofen"])

        self.assertEqual(result["pairs_checked"], 3)
        self.assertEqual(result["triplets_checked"], 1)
        self.assertEqual(result["evaluated_combination_depth"], 3)
        self.assertEqual(result["max_supported_combination_size"], 3)
        self.assertEqual(result["not_evaluated_depths"], [])
        self.assertFalse(result["coverage_gap"])
        self.assertTrue(any(f["finding_type"] == "side_effect" for f in result["findings"]))
        self.assertTrue(any(f["combination_size"] == 3 for f in result["findings"]))

    def test_resolves_with_pharmacy_drug_code_fallback(self):
        Drug.objects.create(
            drug_code="DB00001",
            name="Aspirin",
            generic_name="Acetylsalicylic acid",
            manufacturer="Test Pharma",
            dosage_form="tablet",
            strength="100mg",
            unit_price=1.0,
            reorder_level=10,
        )
        Drug.objects.create(
            drug_code="DB00002",
            name="Warfarin",
            generic_name="Warfarin",
            manufacturer="Test Pharma",
            dosage_form="tablet",
            strength="5mg",
            unit_price=1.0,
            reorder_level=10,
        )
        MedicationInteractionKnowledge.objects.create(
            combination_signature="db00001|db00002",
            medications=["db00001", "db00002"],
            combination_size=2,
            side_effect="Bleeding risk",
            severity="high",
            source="HODDI",
            source_version="v1",
        )

        result = evaluate_medication_safety(["Aspirin", "Warfarin"])
        self.assertEqual(result["totals"]["high"], 1)

    def test_marks_not_evaluated_depths_beyond_triplets(self):
        result = evaluate_medication_safety(["a", "b", "c", "d", "e"])
        self.assertEqual(result["evaluated_combination_depth"], 3)
        self.assertEqual(result["max_supported_combination_size"], 3)
        self.assertEqual(result["not_evaluated_depths"], [4, 5])
        self.assertTrue(result["coverage_gap"])


class MedicationInteractionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            username="patient_interactions",
            email="patient_interactions@test.com",
            password="testpass123",
            role="patient",
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id="PAT-INT-1",
            date_of_birth=date(1990, 1, 1),
            gender="M",
            phone="+919999999991",
            emergency_contact="+919999999992",
            address="Test Address",
            city="Test City",
            state="Test State",
            postal_code="12345",
        )

        self.doctor_user = User.objects.create_user(
            username="doctor_interactions",
            email="doctor_interactions@test.com",
            password="testpass123",
            role="doctor",
        )
        dept = Department.objects.create(
            name="Gen Med",
            code="GMED",
            floor=1,
            building="A",
            phone="+911234567890",
            email="gmed@test.com",
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id="DR-INT-1",
            specialization="general",
            license_number="LIC-INT-1",
            qualification="MBBS",
            experience_years=10,
            department=dept,
            consultation_fee=500,
            phone="+911234567891",
        )

    def test_patient_can_call_check_endpoint(self):
        MedicationSideEffect.objects.create(
            medication_name="metformin",
            side_effect="Nausea",
            severity="low",
            source="HODDI",
            source_version="v1",
        )
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.post(
            "/api/medical-records/drug-interactions/check/",
            {"medications": ["Metformin"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("findings", response.data)
        self.assertGreaterEqual(len(response.data["findings"]), 1)
        self.assertIn("evaluated_combination_depth", response.data)
        self.assertIn("max_supported_combination_size", response.data)
        self.assertIn("coverage_gap", response.data)
        self.assertIn("requested_medications", response.data)

    def test_patient_check_merges_active_medications(self):
        MedicationInteractionKnowledge.objects.create(
            combination_signature="metformin|warfarin",
            medications=["metformin", "warfarin"],
            combination_size=2,
            side_effect="Bleeding risk",
            severity="high",
            source="HODDI",
            source_version="v1",
        )
        record = MedicalRecord.objects.create(
            record_id="REC-CHECK-AGG-1",
            patient=self.patient,
            doctor=self.doctor,
            record_type="prescription",
            record_date=date(2026, 1, 1),
            diagnosis="test",
        )
        Prescription.objects.create(
            medical_record=record,
            medication_name="Warfarin",
            dosage="5mg",
            frequency="OD",
            duration="7 days",
            status="signed",
            is_signed=True,
        )

        self.client.force_authenticate(user=self.patient_user)
        response = self.client.post(
            "/api/medical-records/drug-interactions/check/",
            {"medications": ["Metformin"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totals"]["high"], 1)
        self.assertIn("warfarin", response.data["active_medications_added"])

    def test_prescription_create_returns_interaction_check_payload(self):
        MedicationInteractionKnowledge.objects.create(
            combination_signature="aspirin|warfarin",
            medications=["aspirin", "warfarin"],
            combination_size=2,
            side_effect="Bleeding risk",
            severity="high",
            source="HODDI",
            source_version="v1",
        )
        record = MedicalRecord.objects.create(
            record_id="REC-CREATE-WARN-1",
            patient=self.patient,
            doctor=self.doctor,
            record_type="prescription",
            record_date=date(2026, 1, 1),
            diagnosis="test",
        )
        Prescription.objects.create(
            medical_record=record,
            medication_name="Warfarin",
            dosage="5mg",
            frequency="OD",
            duration="7 days",
            status="signed",
            is_signed=True,
        )

        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.post(
            "/api/medical-records/prescriptions/",
            {
                "patient_id": self.patient.id,
                "medication_name": "Aspirin",
                "dosage": "75mg",
                "frequency": "OD",
                "duration": "5 days",
                "instructions": "after food",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("interaction_check", response.data)
        self.assertTrue(response.data["interaction_check"]["has_findings"])

    def test_report_generation_persists_items(self):
        MedicationInteractionKnowledge.objects.create(
            combination_signature="aspirin|ibuprofen",
            medications=["aspirin", "ibuprofen"],
            combination_size=2,
            side_effect="GI bleeding",
            severity="high",
            source="HODDI",
            source_version="v1",
        )
        report = generate_and_store_report(
            patient=self.patient,
            generated_by=self.doctor_user,
            trigger_event="test_event",
            candidate_medications=["Aspirin", "Ibuprofen"],
        )
        self.assertEqual(report.total_medications, 2)
        self.assertEqual(report.total_findings, 1)
        self.assertEqual(report.items.count(), 1)

    def test_patient_can_generate_latest_report_endpoint(self):
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.post(
            "/api/medical-records/drug-interactions/reports/generate/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("task_id", response.data)
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "queued")

    def test_patient_can_check_report_status_endpoint(self):
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.post(
            "/api/medical-records/drug-interactions/reports/generate/",
            {},
            format="json",
        )
        task_id = response.data["task_id"]
        job = MedicationInteractionReportJob.objects.get(task_id=task_id)
        self.assertEqual(job.patient_id, self.patient.id)

        status_response = self.client.get(
            "/api/medical-records/drug-interactions/reports/status/",
            {"task_id": task_id},
        )
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.data["task_id"], task_id)
        self.assertIn(status_response.data["status"], {"queued", "running", "succeeded", "failed"})

    def test_missing_async_job_is_safe_noop(self):
        payload = generate_interaction_report_job.run(999999)
        self.assertEqual(payload["status"], "missing")


class MedicationReportPDFTests(TestCase):
    """Tests for the GET /reports/latest/pdf/ endpoint."""

    def setUp(self):
        self.client = APIClient()

        # Primary patient + user
        self.patient_user = User.objects.create_user(
            username="patient_pdf_tests",
            email="patient_pdf@test.com",
            password="testpass123",
            role="patient",
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id="PAT-PDF-1",
            date_of_birth=date(1988, 5, 20),
            gender="F",
            phone="+919988776655",
            emergency_contact="+919988776644",
            address="123 Test Street",
            city="Chennai",
            state="Tamil Nadu",
            postal_code="600001",
        )

        # A second patient whose report the first patient must NOT access
        self.other_patient_user = User.objects.create_user(
            username="other_patient_pdf",
            email="other_pdf@test.com",
            password="testpass123",
            role="patient",
        )
        self.other_patient = Patient.objects.create(
            user=self.other_patient_user,
            patient_id="PAT-PDF-2",
            date_of_birth=date(1975, 3, 10),
            gender="M",
            phone="+919900112233",
            emergency_contact="+919900112244",
            address="456 Other Street",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400001",
        )

        # Doctor with access to the primary patient
        self.doctor_user = User.objects.create_user(
            username="doctor_pdf_tests",
            email="doctor_pdf@test.com",
            password="testpass123",
            role="doctor",
        )
        dept = Department.objects.get_or_create(
            code="GPDF",
            defaults={
                "name": "General PDF",
                "floor": 1,
                "building": "B",
                "phone": "+911234500000",
                "email": "gpdf@test.com",
            },
        )[0]
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            doctor_id="DR-PDF-1",
            specialization="general",
            license_number="LIC-PDF-1",
            qualification="MBBS",
            experience_years=8,
            department=dept,
            consultation_fee=600,
            phone="+911234500001",
        )
        # Link doctor to patient via a MedicalRecord so _resolve_patient passes
        MedicalRecord.objects.create(
            record_id="REC-PDF-1",
            patient=self.patient,
            doctor=self.doctor,
            record_type="consultation",
            record_date=date(2026, 1, 1),
            diagnosis="Routine checkup",
        )

        from apps.clinical.records.interaction_service import generate_and_store_report
        # Seed a report for the primary patient
        self.report = generate_and_store_report(
            patient=self.patient,
            generated_by=self.doctor_user,
            trigger_event="test_pdf",
            candidate_medications=["Aspirin", "Warfarin"],
        )

    def test_doctor_can_download_pdf_for_patient(self):
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(
            "/api/medical-records/drug-interactions/reports/latest/pdf/",
            {"patient_id": self.patient.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn(".pdf", response["Content-Disposition"])

    def test_patient_can_download_own_pdf(self):
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get(
            "/api/medical-records/drug-interactions/reports/latest/pdf/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")

    def test_patient_cannot_download_another_patients_pdf(self):
        # patient_user tries to access other_patient's report
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get(
            "/api/medical-records/drug-interactions/reports/latest/pdf/",
            {"patient_id": self.other_patient.id},
        )
        # Patient role: _resolve_patient returns own profile, ignoring patient_id param,
        # so it will return their own report (not 403). The restriction is that a patient
        # user's own patient_profile is always used — they cannot impersonate another patient.
        # The response must either be their own 200 or 404 (no report yet), not the other's.
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # And must NOT return the other patient's data in the Content-Disposition header
        if response.status_code == status.HTTP_200_OK:
            self.assertNotIn(
                self.other_patient.patient_id,
                response.get("Content-Disposition", ""),
            )

    def test_no_report_returns_404(self):
        # other_patient has no report yet
        self.client.force_authenticate(user=self.doctor_user)
        # Give doctor access to other_patient too
        MedicalRecord.objects.create(
            record_id="REC-PDF-2",
            patient=self.other_patient,
            doctor=self.doctor,
            record_type="consultation",
            record_date=date(2026, 1, 1),
            diagnosis="Check",
        )
        response = self.client.get(
            "/api/medical-records/drug-interactions/reports/latest/pdf/",
            {"patient_id": self.other_patient.id},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
