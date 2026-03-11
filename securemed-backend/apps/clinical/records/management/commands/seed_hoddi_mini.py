import os
from pathlib import Path

from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Seed HODDI interactions from a dataset path (prefers local data/hoddi)."

    def handle(self, *args, **options):
        candidates = [
            os.environ.get("HODDI_DATASET_PATH"),
            "/app/data/hoddi/HODDI_v2",
            "/app/.data/hoddi/HODDI_v2",
            "/tmp/HODDI/dataset/HODDI_v2",
        ]
        dataset_path = next((path for path in candidates if path and Path(path).exists()), None)
        dataset_version = os.environ.get("HODDI_DATASET_VERSION", "HODDI_v2")
        side_effect_map = os.environ.get("HODDI_SIDE_EFFECT_MAP")
        drug_map = os.environ.get("HODDI_DRUG_MAP")
        include_negative = os.environ.get("HODDI_INCLUDE_NEGATIVE", "").lower() in {"1", "true", "yes"}

        if not dataset_path:
            self.stdout.write(
                self.style.WARNING(
                    "HODDI dataset not found. Set HODDI_DATASET_PATH or place data under "
                    "/app/data/hoddi/HODDI_v2."
                )
            )
            return

        if not side_effect_map:
            candidate = Path(dataset_path) / "dictionary/Side_effects_unique.csv"
            if candidate.exists():
                side_effect_map = str(candidate)
        if not drug_map:
            candidate = Path(dataset_path) / "dictionary/Drugbank_ID_SMILE_all_structure links.csv"
            if candidate.exists():
                drug_map = str(candidate)

        kwargs = {
            "path": dataset_path,
            "dataset_version": dataset_version,
            "truncate": True,
        }
        if side_effect_map:
            kwargs["side_effect_map"] = side_effect_map
        if drug_map:
            kwargs["drug_map"] = drug_map
        if include_negative:
            kwargs["include_negative"] = True

        self.stdout.write(self.style.WARNING("[HODDI] Importing dataset..."))
        call_command("import_hoddi", **kwargs)
        self.stdout.write(self.style.SUCCESS("[HODDI] Dataset import complete."))
