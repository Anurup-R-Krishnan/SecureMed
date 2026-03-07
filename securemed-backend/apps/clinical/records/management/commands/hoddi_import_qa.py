import json
from collections import Counter

from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.clinical.records.models import (
    MedicationInteractionKnowledge,
    MedicationReference,
    MedicationSideEffect,
)


class Command(BaseCommand):
    help = "Summarize imported HODDI interaction dataset quality/coverage metrics."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source-version",
            default="",
            help="Optional source_version filter (e.g. HODDI_v2).",
        )
        parser.add_argument(
            "--top",
            type=int,
            default=10,
            help="Top-N rows for frequency summaries (default: 10).",
        )

    def handle(self, *args, **options):
        source_version = options["source_version"].strip()
        top_n = max(1, options["top"])

        knowledge_qs = MedicationInteractionKnowledge.objects.all()
        side_effect_qs = MedicationSideEffect.objects.all()
        reference_qs = MedicationReference.objects.all()

        if source_version:
            knowledge_qs = knowledge_qs.filter(source_version=source_version)
            side_effect_qs = side_effect_qs.filter(source_version=source_version)

        combo_distribution = {
            str(row["combination_size"]): row["count"]
            for row in knowledge_qs.values("combination_size").annotate(count=Count("id")).order_by("combination_size")
        }
        severity_distribution = {
            row["severity"]: row["count"]
            for row in knowledge_qs.values("severity").annotate(count=Count("id")).order_by("severity")
        }
        source_version_distribution = {
            (row["source_version"] or "unknown"): row["count"]
            for row in MedicationInteractionKnowledge.objects.values("source_version")
            .annotate(count=Count("id"))
            .order_by("-count")
        }

        top_side_effects = [
            {"side_effect": row["side_effect"], "count": row["count"]}
            for row in knowledge_qs.values("side_effect").annotate(count=Count("id")).order_by("-count")[:top_n]
        ]

        # Identify duplicate reference mappings as a quick consistency signal.
        duplicate_reference_names = Counter(reference_qs.values_list("normalized_name", flat=True))
        top_duplicate_reference_names = [
            {"normalized_name": name, "count": count}
            for name, count in duplicate_reference_names.most_common(top_n)
            if count > 1
        ]

        payload = {
            "source_version_filter": source_version or "all",
            "knowledge_rows": knowledge_qs.count(),
            "single_drug_side_effect_rows": side_effect_qs.count(),
            "reference_rows": reference_qs.count(),
            "combination_size_distribution": combo_distribution,
            "severity_distribution": severity_distribution,
            "source_version_distribution": source_version_distribution,
            "top_side_effects": top_side_effects,
            "top_duplicate_reference_names": top_duplicate_reference_names,
        }
        self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))

