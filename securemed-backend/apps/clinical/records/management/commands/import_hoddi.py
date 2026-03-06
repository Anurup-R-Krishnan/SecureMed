import ast
import csv
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from django.core.management.base import BaseCommand, CommandError

from apps.clinical.records.interaction_service import canonical_signature, normalize_medication_name
from apps.clinical.records.models import MedicationInteractionKnowledge, MedicationReference, MedicationSideEffect


class Command(BaseCommand):
    help = "Import HODDI-like dataset CSV into interaction knowledge tables."

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="Path to CSV file")
        parser.add_argument("--version", default="", help="Dataset version label")
        parser.add_argument("--truncate", action="store_true", help="Delete existing imported data first")
        parser.add_argument("--include-negative", action="store_true", help="Import rows with hyperedge_label != 1")
        parser.add_argument("--source", default="HODDI", help="Source name label (default: HODDI)")
        parser.add_argument(
            "--side-effect-map",
            default="",
            help="Optional CSV with side effect code->label mapping (e.g. UMLS CUI to term).",
        )
        parser.add_argument(
            "--drug-map",
            default="",
            help="Optional CSV mapping DrugBank IDs to medication names for name->ID resolution.",
        )

    @staticmethod
    def _detect_column(header: Iterable[str], candidates: Iterable[str]) -> Optional[str]:
        normalized = {col.lower().strip(): col for col in header}
        for cand in candidates:
            if cand in normalized:
                return normalized[cand]
        return None

    @staticmethod
    def _parse_medication_list(raw_value: str) -> List[str]:
        value = (raw_value or "").strip()
        if not value:
            return []
        if value.startswith("[") and value.endswith("]"):
            try:
                parsed = ast.literal_eval(value)
                meds = [normalize_medication_name(str(item)) for item in parsed if str(item).strip()]
                return sorted(set(meds))
            except Exception:
                pass
        meds = [
            normalize_medication_name(part)
            for part in value.replace(";", "|").replace(",", "|").split("|")
            if part.strip()
        ]
        return sorted(set(meds))

    def _load_side_effect_map(self, map_path: str) -> Dict[str, str]:
        if not map_path:
            return {}
        mapping: Dict[str, str] = {}
        path = Path(map_path).expanduser()
        if not path.exists():
            raise CommandError(f"side-effect-map file not found: {path}")
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            header = [h for h in (reader.fieldnames or []) if h]
            if not header:
                return mapping
            code_col = self._detect_column(
                header, ["umls_cui_from_meddra", "umls_cui", "se_above_0.9", "side_effect_code", "cui", "code"]
            )
            label_col = self._detect_column(header, ["recommended_meddra_term", "term", "side_effect", "label", "name"])
            if not code_col or not label_col:
                raise CommandError(
                    "side-effect-map requires recognizable code and label columns "
                    "(e.g. umls_cui_from_meddra + recommended_meddra_term)."
                )
            for row in reader:
                code = (row.get(code_col) or "").strip()
                label = (row.get(label_col) or "").strip()
                if code and label:
                    mapping[code] = label
        return mapping

    def _iter_csv_files(self, root_path: Path) -> List[Path]:
        if root_path.is_file():
            return [root_path]
        return sorted([p for p in root_path.rglob("*.csv") if p.is_file()])

    def _load_drug_map(self, map_path: str, source_name: str) -> int:
        if not map_path:
            return 0
        path = Path(map_path).expanduser()
        if not path.exists():
            raise CommandError(f"drug-map file not found: {path}")
        created = 0
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            header = [h for h in (reader.fieldnames or []) if h]
            if not header:
                return created
            id_col = self._detect_column(header, ["drugbank_id", "drugbank id", "drugbankid", "id", "identifier"])
            name_col = self._detect_column(header, ["name", "drug_name", "generic_name", "drug"])
            if not id_col or not name_col:
                raise CommandError(
                    "drug-map requires recognizable ID and name columns "
                    "(e.g. drugbank_id + name)."
                )
            for row in reader:
                identifier = normalize_medication_name(row.get(id_col, ""))
                display_name = (row.get(name_col) or "").strip()
                normalized_name = normalize_medication_name(display_name)
                if not identifier or not normalized_name:
                    continue
                _, was_created = MedicationReference.objects.get_or_create(
                    identifier=identifier,
                    normalized_name=normalized_name,
                    defaults={
                        "display_name": display_name,
                        "source": source_name,
                    },
                )
                if was_created:
                    created += 1
        return created

    def _parse_row(
        self,
        row: Dict[str, str],
        *,
        meds_col: str,
        side_effect_col: str,
        severity_col: Optional[str],
        description_col: Optional[str],
        label_col: Optional[str],
        include_negative: bool,
    ) -> Optional[Dict[str, str]]:
        if label_col:
            label_val = str(row.get(label_col, "")).strip()
            if label_val and label_val != "1" and not include_negative:
                return None

        meds = self._parse_medication_list(row.get(meds_col, ""))
        if not meds:
            return None

        raw_side_effect = (row.get(side_effect_col) or "").strip()
        if not raw_side_effect:
            return None

        severity = ((row.get(severity_col) if severity_col else "") or "moderate").strip().lower()
        if severity not in {"low", "moderate", "high", "critical"}:
            severity = "moderate"

        description = ((row.get(description_col) if description_col else "") or "").strip()
        return {
            "medications": meds,
            "side_effect": raw_side_effect,
            "severity": severity,
            "description": description,
        }

    def handle(self, *args, **options):
        input_path = Path(options["path"]).expanduser()
        if not input_path.exists():
            raise CommandError(f"Path not found: {input_path}")

        if options["truncate"]:
            MedicationInteractionKnowledge.objects.all().delete()
            MedicationSideEffect.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing interaction knowledge and side effects."))

        created_knowledge = 0
        created_side_effects = 0
        processed_rows = 0
        processed_files = 0
        dataset_version = options["version"]
        include_negative = options["include_negative"]
        source_name = options["source"]
        side_effect_map = self._load_side_effect_map(options["side_effect_map"])
        reference_count = self._load_drug_map(options["drug_map"], source_name)

        csv_files = self._iter_csv_files(input_path)
        if not csv_files:
            raise CommandError(f"No CSV files found under {input_path}")

        for csv_path in csv_files:
            with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                header = [h for h in (reader.fieldnames or []) if h]
                if not header:
                    continue

                meds_col = self._detect_column(header, ["drugs", "drugbankid", "drugbank_id", "medications", "drug_ids"])
                side_effect_col = self._detect_column(header, ["side_effect", "se_above_0.9", "se", "umls_cui", "cui"])
                if not meds_col or not side_effect_col:
                    continue

                severity_col = self._detect_column(header, ["severity", "risk_level"])
                description_col = self._detect_column(header, ["description", "detail", "notes"])
                label_col = self._detect_column(header, ["hyperedge_label", "label", "is_positive"])

                inferred_version = dataset_version
                if not inferred_version:
                    parts = [part for part in csv_path.parts if part.lower().startswith("hoddi_v")]
                    if parts:
                        inferred_version = parts[0]

                for row in reader:
                    parsed = self._parse_row(
                        row,
                        meds_col=meds_col,
                        side_effect_col=side_effect_col,
                        severity_col=severity_col,
                        description_col=description_col,
                        label_col=label_col,
                        include_negative=include_negative,
                    )
                    if not parsed:
                        continue
                    processed_rows += 1
                    meds = parsed["medications"]
                    side_effect_code = parsed["side_effect"]
                    side_effect = side_effect_map.get(side_effect_code, side_effect_code)

                    if len(meds) == 1:
                        _, created = MedicationSideEffect.objects.get_or_create(
                            medication_name=meds[0],
                            side_effect=side_effect,
                            source_version=inferred_version,
                            defaults={
                                "severity": parsed["severity"],
                                "description": parsed["description"],
                                "source": source_name,
                            },
                        )
                        if created:
                            created_side_effects += 1
                        continue

                    signature = canonical_signature(meds)
                    _, created = MedicationInteractionKnowledge.objects.get_or_create(
                        combination_signature=signature,
                        side_effect=side_effect,
                        source_version=inferred_version,
                        defaults={
                            "medications": meds,
                            "combination_size": len(meds),
                            "severity": parsed["severity"],
                            "description": parsed["description"],
                            "source": source_name,
                            "evidence": {},
                        },
                    )
                    if created:
                        created_knowledge += 1

                processed_files += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Imported "
                f"files={processed_files}, rows={processed_rows}, "
                f"knowledge={created_knowledge}, side_effects={created_side_effects}, "
                f"references={reference_count}, "
                f"version={dataset_version or 'auto'}"
            )
        )
