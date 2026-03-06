import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.clinical.records.interaction_service import canonical_signature, normalize_medication_name
from apps.clinical.records.models import MedicationInteractionKnowledge, MedicationSideEffect


class Command(BaseCommand):
    help = "Import HODDI-like dataset CSV into interaction knowledge tables."

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="Path to CSV file")
        parser.add_argument("--version", default="", help="Dataset version label")
        parser.add_argument("--truncate", action="store_true", help="Delete existing imported data first")

    def handle(self, *args, **options):
        csv_path = Path(options["path"]).expanduser()
        if not csv_path.exists():
            raise CommandError(f"File not found: {csv_path}")

        if options["truncate"]:
            MedicationInteractionKnowledge.objects.all().delete()
            MedicationSideEffect.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing interaction knowledge and side effects."))

        required_cols = {"drugs", "side_effect"}
        created_knowledge = 0
        created_side_effects = 0
        dataset_version = options["version"]

        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            header = set(reader.fieldnames or [])
            if not required_cols.issubset(header):
                raise CommandError(
                    "CSV must include columns: drugs, side_effect. "
                    "Optional: severity, description, source, source_version, evidence_json"
                )

            for row in reader:
                drugs_raw = (row.get("drugs") or "").strip()
                if not drugs_raw:
                    continue
                meds = [
                    normalize_medication_name(part)
                    for part in drugs_raw.replace(";", "|").replace(",", "|").split("|")
                    if part.strip()
                ]
                meds = sorted(set(meds))
                if not meds:
                    continue

                side_effect = (row.get("side_effect") or "").strip()
                severity = (row.get("severity") or "moderate").strip().lower()
                description = (row.get("description") or "").strip()
                source = (row.get("source") or "HODDI").strip()
                source_version = (row.get("source_version") or dataset_version).strip()

                if len(meds) == 1:
                    _, created = MedicationSideEffect.objects.get_or_create(
                        medication_name=meds[0],
                        side_effect=side_effect,
                        source_version=source_version,
                        defaults={
                            "severity": severity,
                            "description": description,
                            "source": source,
                        },
                    )
                    if created:
                        created_side_effects += 1
                    continue

                signature = canonical_signature(meds)
                _, created = MedicationInteractionKnowledge.objects.get_or_create(
                    combination_signature=signature,
                    side_effect=side_effect,
                    source_version=source_version,
                    defaults={
                        "medications": meds,
                        "combination_size": len(meds),
                        "severity": severity,
                        "description": description,
                        "source": source,
                        "evidence": {},
                    },
                )
                if created:
                    created_knowledge += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported knowledge={created_knowledge}, side_effects={created_side_effects}, version={dataset_version or 'n/a'}"
            )
        )
