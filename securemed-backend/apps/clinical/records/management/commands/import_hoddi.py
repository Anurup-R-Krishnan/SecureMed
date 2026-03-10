import csv
from pathlib import Path
from typing import Dict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.clinical.records.interaction_service import (
    bump_safety_cache_namespace,
    canonical_signature,
    normalize_medication_name,
)
from apps.clinical.records.hoddi_import.helpers import (
    DESCRIPTION_COLUMNS,
    DRUG_MAP_ID_COLUMNS,
    DRUG_MAP_NAME_COLUMNS,
    INTERACTION_COLUMNS,
    LABEL_COLUMNS,
    SOURCE_COLUMNS,
    TARGET_COLUMNS,
    SEVERITY_COLUMNS,
    SIDE_EFFECT_COLUMNS,
    SIDE_EFFECT_MAP_CODE_COLUMNS,
    SIDE_EFFECT_MAP_LABEL_COLUMNS,
    detect_column,
    infer_dataset_version,
    iter_csv_files,
    parse_interaction_row_with_reason,
)
from apps.clinical.records.models import MedicationInteractionKnowledge, MedicationReference, MedicationSideEffect


class Command(BaseCommand):
    help = "Import HODDI-like dataset CSV into interaction knowledge tables."

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="Path to CSV file")
        parser.add_argument(
            "--dataset-version",
            default="",
            help="Dataset version label (e.g. HODDI_v2)",
        )
        parser.add_argument("--truncate", action="store_true", help="Delete existing imported data first")
        parser.add_argument("--include-negative", action="store_true", help="Import rows with hyperedge_label != 1")
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Fail import when rows are skipped due to malformed data.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=10000,
            help="Chunk size for bulk inserts (default: 10000).",
        )
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
            code_col = detect_column(header, SIDE_EFFECT_MAP_CODE_COLUMNS)
            label_col = detect_column(header, SIDE_EFFECT_MAP_LABEL_COLUMNS)
            if not code_col or not label_col:
                raise CommandError(
                    "side-effect-map requires recognizable code and label columns "
                    "(e.g. umls_cui_from_meddra + side_effect_name)."
                )
            for row in reader:
                code = (row.get(code_col) or "").strip()
                label = (row.get(label_col) or "").strip()
                if code and label:
                    mapping[code] = label
        return mapping

    def _load_drug_map(self, map_path: str, source_name: str) -> int:
        if not map_path:
            return 0
        path = Path(map_path).expanduser()
        if not path.exists():
            raise CommandError(f"drug-map file not found: {path}")
        before_count = MedicationReference.objects.count()
        pending_refs = []
        batch_size = 5000
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            header = [h for h in (reader.fieldnames or []) if h]
            if not header:
                return 0
            id_col = detect_column(header, DRUG_MAP_ID_COLUMNS)
            name_col = detect_column(header, DRUG_MAP_NAME_COLUMNS)
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
                pending_refs.append(
                    MedicationReference(
                        identifier=identifier,
                        normalized_name=normalized_name,
                        display_name=display_name,
                        source=source_name,
                    )
                )
                if len(pending_refs) >= batch_size:
                    MedicationReference.objects.bulk_create(pending_refs, ignore_conflicts=True, batch_size=batch_size)
                    pending_refs = []
            if pending_refs:
                MedicationReference.objects.bulk_create(pending_refs, ignore_conflicts=True, batch_size=batch_size)
        return max(0, MedicationReference.objects.count() - before_count)

    def _discover_hoddi_drug_map(self, input_path: Path) -> Path | None:
        if input_path.is_file():
            candidates = [input_path.parent, *input_path.parents]
        else:
            candidates = [input_path, *input_path.parents]

        filename = "Drugbank_ID_SMILE_all_structure links.csv"
        for candidate in candidates:
            if candidate.name.lower().startswith("hoddi_v"):
                map_path = candidate / "dictionary" / filename
                if map_path.exists():
                    return map_path
        return None

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
        skipped_rows = 0
        severity_normalized_count = 0
        skip_reasons: Dict[str, int] = {}
        dataset_version = options.get("dataset_version", "") or options.get("version", "")
        include_negative = options["include_negative"]
        strict = options["strict"]
        batch_size = max(100, options["batch_size"])
        source_name = options["source"]
        side_effect_map = self._load_side_effect_map(options["side_effect_map"])
        drug_map_path = options["drug_map"]
        if not drug_map_path:
            auto_map = self._discover_hoddi_drug_map(input_path)
            if auto_map:
                drug_map_path = str(auto_map)
                self.stdout.write(f"Auto-detected drug map: {auto_map}")
            else:
                self.stdout.write("No auto-detected HODDI drug map found; continuing without references.")
        reference_count = self._load_drug_map(drug_map_path, source_name)
        knowledge_before = MedicationInteractionKnowledge.objects.count()
        side_effects_before = MedicationSideEffect.objects.count()
        knowledge_batch = []
        side_effect_batch = []

        csv_files = iter_csv_files(input_path)
        if not csv_files:
            raise CommandError(f"No CSV files found under {input_path}")

        for csv_path in csv_files:
            with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                header = [h for h in (reader.fieldnames or []) if h]
                if not header:
                    continue

                meds_col = detect_column(header, INTERACTION_COLUMNS)
                source_col = None
                target_col = None
                combined_meds_col = None
                if not meds_col:
                    source_col = detect_column(header, SOURCE_COLUMNS)
                    target_col = detect_column(header, TARGET_COLUMNS)
                    if source_col and target_col:
                        combined_meds_col = "__combined_meds__"
                        meds_col = combined_meds_col
                side_effect_col = detect_column(header, SIDE_EFFECT_COLUMNS)
                if not meds_col or not side_effect_col:
                    continue

                severity_col = detect_column(header, SEVERITY_COLUMNS)
                description_col = detect_column(header, DESCRIPTION_COLUMNS)
                label_col = detect_column(header, LABEL_COLUMNS)
                inferred_version = infer_dataset_version(csv_path, dataset_version)

                for row in reader:
                    if combined_meds_col and source_col and target_col:
                        row[combined_meds_col] = f"{row.get(source_col, '')}|{row.get(target_col, '')}"
                    parsed_outcome = parse_interaction_row_with_reason(
                        row,
                        meds_col=meds_col,
                        side_effect_col=side_effect_col,
                        severity_col=severity_col,
                        description_col=description_col,
                        label_col=label_col,
                        include_negative=include_negative,
                    )
                    if not parsed_outcome.row:
                        skipped_rows += 1
                        if parsed_outcome.skip_reason:
                            skip_reasons[parsed_outcome.skip_reason] = skip_reasons.get(parsed_outcome.skip_reason, 0) + 1
                        continue
                    if parsed_outcome.severity_normalized:
                        severity_normalized_count += 1
                    processed_rows += 1
                    parsed = parsed_outcome.row
                    meds = parsed.medications
                    side_effect_code = parsed.side_effect
                    side_effect = side_effect_map.get(side_effect_code, side_effect_code)

                    if len(meds) == 1:
                        side_effect_batch.append(
                            MedicationSideEffect(
                                medication_name=meds[0],
                                side_effect=side_effect,
                                source_version=inferred_version,
                                severity=parsed.severity,
                                description=parsed.description,
                                source=source_name,
                            )
                        )
                        if len(side_effect_batch) >= batch_size:
                            with transaction.atomic():
                                MedicationSideEffect.objects.bulk_create(
                                    side_effect_batch,
                                    ignore_conflicts=True,
                                    batch_size=batch_size,
                                )
                            side_effect_batch = []
                        continue

                    signature = canonical_signature(meds)
                    knowledge_batch.append(
                        MedicationInteractionKnowledge(
                            combination_signature=signature,
                            side_effect=side_effect,
                            source_version=inferred_version,
                            medications=meds,
                            combination_size=len(meds),
                            severity=parsed.severity,
                            description=parsed.description,
                            source=source_name,
                            evidence={},
                        )
                    )
                    if len(knowledge_batch) >= batch_size:
                        with transaction.atomic():
                            MedicationInteractionKnowledge.objects.bulk_create(
                                knowledge_batch,
                                ignore_conflicts=True,
                                batch_size=batch_size,
                            )
                        knowledge_batch = []

                processed_files += 1

        if side_effect_batch:
            with transaction.atomic():
                MedicationSideEffect.objects.bulk_create(
                    side_effect_batch,
                    ignore_conflicts=True,
                    batch_size=batch_size,
                )
        if knowledge_batch:
            with transaction.atomic():
                MedicationInteractionKnowledge.objects.bulk_create(
                    knowledge_batch,
                    ignore_conflicts=True,
                    batch_size=batch_size,
                )
        created_knowledge = max(0, MedicationInteractionKnowledge.objects.count() - knowledge_before)
        created_side_effects = max(0, MedicationSideEffect.objects.count() - side_effects_before)

        if strict and skipped_rows > 0:
            reason_summary = ", ".join(f"{k}={v}" for k, v in sorted(skip_reasons.items()))
            raise CommandError(
                "Strict import failed: "
                f"skipped_rows={skipped_rows}"
                f"{'; reasons: ' + reason_summary if reason_summary else ''}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Imported "
                f"files={processed_files}, rows={processed_rows}, "
                f"knowledge={created_knowledge}, side_effects={created_side_effects}, "
                f"references={reference_count}, "
                f"skipped_rows={skipped_rows}, severity_normalized={severity_normalized_count}, "
                f"batch_size={batch_size}, "
                f"version={dataset_version or 'auto'}"
            )
        )
        cache_ns = bump_safety_cache_namespace()
        self.stdout.write(f"Safety cache namespace bumped: {cache_ns}")
