from itertools import combinations
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from django.db.models import Q

from .models import (
    DrugInteraction,
    MedicationInteractionKnowledge,
    MedicationInteractionReport,
    MedicationInteractionReportItem,
    MedicationReference,
    MedicationSideEffect,
    Prescription,
)
from apps.clinical.pharmacy.models import Drug


SEVERITY_ORDER = {
    "critical": 0,
    "high": 1,
    "moderate": 2,
    "low": 3,
}
MAX_EVALUATED_COMBINATION_SIZE = 3


def normalize_medication_name(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def canonical_signature(medications: Sequence[str]) -> str:
    normalized = sorted({normalize_medication_name(m) for m in medications if m})
    return "|".join(normalized)


def resolve_medications_for_knowledge(medications: Sequence[str]) -> List[str]:
    normalized_inputs = [normalize_medication_name(m) for m in medications if m]
    if not normalized_inputs:
        return []

    refs = MedicationReference.objects.filter(normalized_name__in=normalized_inputs).order_by("id")
    by_name: Dict[str, str] = {}
    for ref in refs:
        # First seen mapping wins for deterministic behavior.
        by_name.setdefault(ref.normalized_name, normalize_medication_name(ref.identifier))

    # Fallback to pharmacy inventory code if available (useful when drug_code stores canonical IDs).
    unresolved = [name for name in normalized_inputs if name not in by_name and not (name.startswith("db") and name[2:].isdigit())]
    if unresolved:
        for unresolved_name in unresolved:
            drug = (
                Drug.objects.filter(name__iexact=unresolved_name, is_active=True)
                .only("name", "drug_code")
                .first()
            )
            if drug and drug.name and drug.drug_code:
                normalized_name = normalize_medication_name(drug.name)
                by_name.setdefault(normalized_name, normalize_medication_name(drug.drug_code))

    resolved: List[str] = []
    for med in normalized_inputs:
        if med.startswith("db") and med[2:].isdigit():
            resolved.append(med)
        else:
            resolved.append(by_name.get(med, med))
    return sorted(set(resolved))


def _get_active_medications_for_patient(patient_id: int) -> List[str]:
    rows = Prescription.objects.filter(
        medical_record__patient_id=patient_id,
        status__in=["signed", "dispensed"],
    ).values_list("medication_name", flat=True)
    meds = resolve_medications_for_knowledge([name for name in rows if name])
    # Preserve stable order for deterministic report payloads.
    return sorted(set(meds))


def get_active_medications_for_patient(patient_id: int) -> List[str]:
    return _get_active_medications_for_patient(patient_id)


def _single_drug_findings(medications: Iterable[str]) -> List[Dict]:
    findings: List[Dict] = []
    for med in medications:
        for effect in MedicationSideEffect.objects.filter(medication_name__iexact=med):
            findings.append(
                {
                    "finding_type": "side_effect",
                    "medications": [med],
                    "combination_size": 1,
                    "side_effect": effect.side_effect,
                    "severity": effect.severity,
                    "description": effect.description,
                    "source": effect.source,
                    "source_reference": effect.source_version,
                }
            )
    return findings


def _knowledge_findings_for_combos(combo_groups: Iterable[Tuple[str, ...]]) -> List[Dict]:
    findings: List[Dict] = []
    for meds in combo_groups:
        signature = canonical_signature(meds)
        if not signature:
            continue
        rows = MedicationInteractionKnowledge.objects.filter(combination_signature=signature)
        for row in rows:
            findings.append(
                {
                    "finding_type": "interaction",
                    "medications": list(meds),
                    "combination_size": len(meds),
                    "side_effect": row.side_effect,
                    "severity": row.severity,
                    "description": row.description,
                    "source": row.source,
                    "source_reference": row.source_version,
                }
            )
    return findings


def _fallback_pair_findings(pair_groups: Iterable[Tuple[str, str]]) -> List[Dict]:
    findings: List[Dict] = []
    for a, b in pair_groups:
        inter = DrugInteraction.objects.filter(
            Q(drug_a__iexact=a, drug_b__iexact=b) | Q(drug_a__iexact=b, drug_b__iexact=a)
        ).first()
        if inter:
            findings.append(
                {
                    "finding_type": "interaction",
                    "medications": [a, b],
                    "combination_size": 2,
                    "side_effect": inter.description or f"Interaction between {a} and {b}",
                    "severity": inter.severity,
                    "description": inter.description,
                    "source": "SecureMed Seed",
                    "source_reference": "",
                }
            )
    return findings


def evaluate_medication_safety(medications: Sequence[str]) -> Dict:
    normalized = resolve_medications_for_knowledge(medications)
    if not normalized:
        return {
            "medications": [],
            "pairs_checked": 0,
            "triplets_checked": 0,
            "evaluated_combination_depth": MAX_EVALUATED_COMBINATION_SIZE,
            "not_evaluated_depths": [],
            "findings": [],
            "totals": {"critical": 0, "high": 0, "moderate": 0, "low": 0},
        }

    pairs = list(combinations(normalized, 2))
    triplets = list(combinations(normalized, 3))

    findings = []
    findings.extend(_single_drug_findings(normalized))
    findings.extend(_knowledge_findings_for_combos(triplets))
    findings.extend(_knowledge_findings_for_combos(pairs))
    findings.extend(_fallback_pair_findings(pairs))

    # Deduplicate by semantic identity.
    dedup_key = set()
    unique_findings = []
    for finding in findings:
        key = (
            finding["finding_type"],
            tuple(sorted(finding["medications"])),
            finding["side_effect"].strip().lower(),
            finding["severity"],
        )
        if key not in dedup_key:
            dedup_key.add(key)
            unique_findings.append(finding)

    unique_findings.sort(
        key=lambda x: (
            SEVERITY_ORDER.get(x["severity"], 99),
            -x["combination_size"],
            ",".join(x["medications"]),
        )
    )

    totals = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    for finding in unique_findings:
        if finding["severity"] in totals:
            totals[finding["severity"]] += 1

    return {
        "medications": normalized,
        "pairs_checked": len(pairs),
        "triplets_checked": len(triplets),
        "evaluated_combination_depth": MAX_EVALUATED_COMBINATION_SIZE,
        "not_evaluated_depths": list(range(MAX_EVALUATED_COMBINATION_SIZE + 1, len(normalized) + 1))
        if len(normalized) > MAX_EVALUATED_COMBINATION_SIZE
        else [],
        "findings": unique_findings,
        "totals": totals,
    }


def generate_and_store_report(
    *,
    patient,
    generated_by=None,
    trigger_event: str = "manual",
    candidate_medications: Optional[Sequence[str]] = None,
) -> MedicationInteractionReport:
    current_meds = _get_active_medications_for_patient(patient.id)
    if candidate_medications:
        current_meds = sorted(set(current_meds + [normalize_medication_name(m) for m in candidate_medications if m]))

    result = evaluate_medication_safety(current_meds)
    finding_versions = sorted({f["source_reference"] for f in result["findings"] if f.get("source_reference")})
    if len(finding_versions) == 1:
        source_version = finding_versions[0]
    elif len(finding_versions) > 1:
        source_version = "mixed"
    else:
        source_version = ""

    report = MedicationInteractionReport.objects.create(
        patient=patient,
        generated_by=generated_by,
        trigger_event=trigger_event,
        medications=result["medications"],
        total_medications=len(result["medications"]),
        total_pairs_checked=result["pairs_checked"],
        total_triplets_checked=result["triplets_checked"],
        total_findings=len(result["findings"]),
        critical_count=result["totals"]["critical"],
        high_count=result["totals"]["high"],
        moderate_count=result["totals"]["moderate"],
        low_count=result["totals"]["low"],
        source_version=source_version,
    )

    MedicationInteractionReportItem.objects.bulk_create(
        [
            MedicationInteractionReportItem(
                report=report,
                finding_type=finding["finding_type"],
                medications=finding["medications"],
                combination_size=finding["combination_size"],
                side_effect=finding["side_effect"],
                severity=finding["severity"],
                description=finding["description"],
                source=finding["source"],
                source_reference=finding["source_reference"],
            )
            for finding in result["findings"]
        ],
        batch_size=1000,
    )

    return report
