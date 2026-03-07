import csv
import json
import tempfile
from pathlib import Path
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.clinical.records.interaction_service import evaluate_medication_safety
from apps.clinical.records.models import MedicationInteractionKnowledge, MedicationReference, MedicationSideEffect


class ImportHoddiCommandTests(TestCase):
    def test_imports_hoddi_style_positive_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "2024Q1_positive_samples_condition123_SE_above_0.9.csv"
            with csv_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["DrugBankID", "SE_above_0.9", "hyperedge_label"])
                writer.writeheader()
                writer.writerow(
                    {
                        "DrugBankID": "['DB00001', 'DB00002', 'DB00003']",
                        "SE_above_0.9": "C0018799",
                        "hyperedge_label": "1",
                    }
                )
                writer.writerow(
                    {
                        "DrugBankID": "['DB00011', 'DB00012']",
                        "SE_above_0.9": "C9999999",
                        "hyperedge_label": "-1",
                    }
                )

            call_command("import_hoddi", path=str(csv_path), dataset_version="HODDI_v2")

            self.assertEqual(MedicationInteractionKnowledge.objects.count(), 1)
            row = MedicationInteractionKnowledge.objects.first()
            self.assertEqual(row.combination_size, 3)
            self.assertEqual(row.source_version, "HODDI_v2")
            self.assertEqual(row.side_effect, "C0018799")

    def test_imports_generic_single_drug_side_effect(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "single_effects.csv"
            with csv_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["drugs", "side_effect", "severity"])
                writer.writeheader()
                writer.writerow(
                    {
                        "drugs": "metformin",
                        "side_effect": "Nausea",
                        "severity": "low",
                    }
                )

            call_command("import_hoddi", path=str(csv_path), dataset_version="HODDI_v2")
            self.assertEqual(MedicationSideEffect.objects.count(), 1)
            side_effect = MedicationSideEffect.objects.first()
            self.assertEqual(side_effect.medication_name, "metformin")
            self.assertEqual(side_effect.side_effect, "Nausea")
            self.assertEqual(side_effect.severity, "low")

    def test_side_effect_mapping_is_applied(self):
        with tempfile.TemporaryDirectory() as tmp:
            data_path = Path(tmp) / "hoddi.csv"
            map_path = Path(tmp) / "se_map.csv"

            with data_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["DrugBankID", "SE_above_0.9", "hyperedge_label"])
                writer.writeheader()
                writer.writerow(
                    {
                        "DrugBankID": "['DB00001', 'DB00002']",
                        "SE_above_0.9": "C0018799",
                        "hyperedge_label": "1",
                    }
                )

            with map_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["umls_cui_from_meddra", "recommended_meddra_term"])
                writer.writeheader()
                writer.writerow(
                    {
                        "umls_cui_from_meddra": "C0018799",
                        "recommended_meddra_term": "Gastrointestinal haemorrhage",
                    }
                )

            call_command("import_hoddi", path=str(data_path), dataset_version="HODDI_v2", side_effect_map=str(map_path))
            row = MedicationInteractionKnowledge.objects.first()
            self.assertEqual(row.side_effect, "Gastrointestinal haemorrhage")

    def test_side_effect_mapping_supports_official_hoddi_v2_dictionary_headers(self):
        with tempfile.TemporaryDirectory() as tmp:
            data_path = Path(tmp) / "hoddi.csv"
            map_path = Path(tmp) / "Side_effects_unique.csv"

            with data_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["DrugBankID", "SE_above_0.9", "hyperedge_label"])
                writer.writeheader()
                writer.writerow(
                    {
                        "DrugBankID": "['DB00001', 'DB00002']",
                        "SE_above_0.9": "C0018799",
                        "hyperedge_label": "1",
                    }
                )

            # Mirrors official HODDI v2 side-effect dictionary headers.
            with map_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=["umls_cui_from_meddra", "side_effect_name"],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "umls_cui_from_meddra": "C0018799",
                        "side_effect_name": "Gastrointestinal haemorrhage",
                    }
                )

            call_command("import_hoddi", path=str(data_path), dataset_version="HODDI_v2", side_effect_map=str(map_path))
            row = MedicationInteractionKnowledge.objects.first()
            self.assertEqual(row.side_effect, "Gastrointestinal haemorrhage")

    def test_drug_map_enables_name_to_drugbank_resolution(self):
        with tempfile.TemporaryDirectory() as tmp:
            data_path = Path(tmp) / "hoddi.csv"
            map_path = Path(tmp) / "drug_map.csv"

            with data_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["DrugBankID", "SE_above_0.9", "hyperedge_label"])
                writer.writeheader()
                writer.writerow(
                    {
                        "DrugBankID": "['DB00001', 'DB00002']",
                        "SE_above_0.9": "Bleeding risk",
                        "hyperedge_label": "1",
                    }
                )

            with map_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["drugbank_id", "name"])
                writer.writeheader()
                writer.writerow({"drugbank_id": "DB00001", "name": "Aspirin"})
                writer.writerow({"drugbank_id": "DB00002", "name": "Warfarin"})

            call_command("import_hoddi", path=str(data_path), dataset_version="HODDI_v2", drug_map=str(map_path))
            self.assertEqual(MedicationReference.objects.count(), 2)

            result = evaluate_medication_safety(["Aspirin", "Warfarin"])
            self.assertEqual(result["totals"]["moderate"], 1)

    def test_strict_mode_fails_when_rows_are_skipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "strict_mode.csv"
            with csv_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["DrugBankID", "SE_above_0.9", "hyperedge_label"])
                writer.writeheader()
                writer.writerow(
                    {
                        "DrugBankID": "['DB00011', 'DB00012']",
                        "SE_above_0.9": "C9999999",
                        "hyperedge_label": "-1",
                    }
                )

            with self.assertRaises(CommandError):
                call_command("import_hoddi", path=str(csv_path), dataset_version="HODDI_v2", strict=True)

    def test_hoddi_import_qa_command_outputs_summary_json(self):
        MedicationInteractionKnowledge.objects.create(
            combination_signature="aspirin|warfarin",
            medications=["aspirin", "warfarin"],
            combination_size=2,
            side_effect="Bleeding risk",
            severity="high",
            source="HODDI",
            source_version="HODDI_v2",
        )
        out = StringIO()
        call_command("hoddi_import_qa", source_version="HODDI_v2", stdout=out)
        payload = json.loads(out.getvalue())
        self.assertEqual(payload["source_version_filter"], "HODDI_v2")
        self.assertGreaterEqual(payload["knowledge_rows"], 1)
        self.assertIn("combination_size_distribution", payload)
