from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.patients.models import Patient
from apps.clinical.pharmacy.models import Drug
from apps.clinical.records.interaction_service import evaluate_medication_safety, generate_and_store_report
from apps.clinical.records.models import MedicalRecord, MedicationInteractionKnowledge, MedicationSideEffect, Prescription
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
        self.assertEqual(result["not_evaluated_depths"], [])
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
        self.assertEqual(result["not_evaluated_depths"], [4, 5])


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
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
