import os
from pathlib import Path

from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Seed HODDI interactions from a dataset path (fallback to /tmp/HODDI/dataset/HODDI_v2)."

    def handle(self, *args, **options):
        dataset_path = os.environ.get("HODDI_DATASET_PATH") or "/tmp/HODDI/dataset/HODDI_v2"
        dataset_version = os.environ.get("HODDI_DATASET_VERSION", "HODDI_v2")
        side_effect_map = os.environ.get("HODDI_SIDE_EFFECT_MAP")
        drug_map = os.environ.get("HODDI_DRUG_MAP")
        include_negative = os.environ.get("HODDI_INCLUDE_NEGATIVE", "").lower() in {"1", "true", "yes"}

        if not Path(dataset_path).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"HODDI dataset not found at {dataset_path}. Skipping HODDI import."
                )
            )
            return

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
