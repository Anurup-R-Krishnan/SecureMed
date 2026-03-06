import csv
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from apps.clinical.records.models import MedicationInteractionKnowledge, MedicationSideEffect


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

            call_command("import_hoddi", path=str(csv_path), version="HODDI_v2")

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

            call_command("import_hoddi", path=str(csv_path), version="HODDI_v2")
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

            call_command("import_hoddi", path=str(data_path), version="HODDI_v2", side_effect_map=str(map_path))
            row = MedicationInteractionKnowledge.objects.first()
            self.assertEqual(row.side_effect, "Gastrointestinal haemorrhage")
