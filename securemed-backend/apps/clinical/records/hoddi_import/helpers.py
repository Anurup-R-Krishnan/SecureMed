import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from apps.clinical.records.interaction_service import normalize_medication_name


INTERACTION_COLUMNS = ["drugs", "drugbankid", "drugbank_id", "medications", "drug_ids"]
SIDE_EFFECT_COLUMNS = ["side_effect", "se_above_0.9", "se", "se_label", "umls_cui", "cui"]
SEVERITY_COLUMNS = ["severity", "risk_level"]
DESCRIPTION_COLUMNS = ["description", "detail", "notes"]
LABEL_COLUMNS = ["hyperedge_label", "label", "is_positive"]
SOURCE_COLUMNS = ["source", "src"]
TARGET_COLUMNS = ["target", "dst"]

SIDE_EFFECT_MAP_CODE_COLUMNS = [
    "umls_cui_from_meddra",
    "recommended_umls_cui_from_meddra",
    "umls_cui",
    "se_above_0.9",
    "side_effect_code",
    "cui",
    "code",
]
SIDE_EFFECT_MAP_LABEL_COLUMNS = [
    "recommended_meddra_term",
    "recommended_se_name",
    "recommended_name",
    "side_effect_name",
    "term",
    "side_effect",
    "label",
    "name",
]
DRUG_MAP_ID_COLUMNS = ["drugbank_id", "drugbank id", "drugbankid", "id", "identifier"]
DRUG_MAP_NAME_COLUMNS = ["name", "drug_name", "generic_name", "drug"]

VALID_SEVERITIES = {"low", "moderate", "high", "critical"}


@dataclass(frozen=True)
class ParsedInteractionRow:
    medications: List[str]
    side_effect: str
    severity: str
    description: str


@dataclass(frozen=True)
class RowParseOutcome:
    row: Optional[ParsedInteractionRow]
    skip_reason: str = ""
    severity_normalized: bool = False


def detect_column(header: Iterable[str], candidates: Iterable[str]) -> Optional[str]:
    normalized = {col.lower().strip(): col for col in header}
    for cand in candidates:
        if cand in normalized:
            return normalized[cand]
    return None


def parse_medication_list(raw_value: str) -> List[str]:
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


def parse_interaction_row(
    row: Dict[str, str],
    *,
    meds_col: str,
    side_effect_col: str,
    severity_col: Optional[str],
    description_col: Optional[str],
    label_col: Optional[str],
    include_negative: bool,
) -> Optional[ParsedInteractionRow]:
    outcome = parse_interaction_row_with_reason(
        row,
        meds_col=meds_col,
        side_effect_col=side_effect_col,
        severity_col=severity_col,
        description_col=description_col,
        label_col=label_col,
        include_negative=include_negative,
    )
    return outcome.row


def parse_interaction_row_with_reason(
    row: Dict[str, str],
    *,
    meds_col: str,
    side_effect_col: str,
    severity_col: Optional[str],
    description_col: Optional[str],
    label_col: Optional[str],
    include_negative: bool,
) -> RowParseOutcome:
    if label_col:
        label_val = str(row.get(label_col, "")).strip()
        if label_val and label_val != "1" and not include_negative:
            return RowParseOutcome(row=None, skip_reason="negative_label_filtered")

    meds = parse_medication_list(row.get(meds_col, ""))
    if not meds:
        return RowParseOutcome(row=None, skip_reason="invalid_or_empty_medications")

    raw_side_effect = (row.get(side_effect_col) or "").strip()
    if not raw_side_effect:
        return RowParseOutcome(row=None, skip_reason="empty_side_effect")

    severity_normalized = False
    severity = ((row.get(severity_col) if severity_col else "") or "moderate").strip().lower()
    if severity not in VALID_SEVERITIES:
        severity = "moderate"
        severity_normalized = True

    description = ((row.get(description_col) if description_col else "") or "").strip()
    return RowParseOutcome(
        row=ParsedInteractionRow(
            medications=meds,
            side_effect=raw_side_effect,
            severity=severity,
            description=description,
        ),
        severity_normalized=severity_normalized,
    )


def infer_dataset_version(csv_path: Path, configured_version: str) -> str:
    if configured_version:
        return configured_version
    parts = [part for part in csv_path.parts if part.lower().startswith("hoddi_v")]
    if parts:
        return parts[0]
    return ""


def iter_csv_files(root_path: Path) -> List[Path]:
    if root_path.is_file():
        return [root_path]
    return sorted([p for p in root_path.rglob("*.csv") if p.is_file()])
