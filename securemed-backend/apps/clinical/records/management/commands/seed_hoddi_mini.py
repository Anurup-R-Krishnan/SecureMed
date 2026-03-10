from django.core.management.base import BaseCommand

from apps.clinical.records.interaction_service import canonical_signature, normalize_medication_name
from apps.clinical.records.models import (
    MedicationInteractionKnowledge,
    MedicationReference,
    MedicationSideEffect,
)


MINI_DRUGS = [
    {"identifier": "db00945", "display": "Aspirin"},
    {"identifier": "db00682", "display": "Warfarin"},
    {"identifier": "db01050", "display": "Ibuprofen"},
]

MINI_SIDE_EFFECTS = [
    {"med": "db00945", "effect": "Nausea", "severity": "low"},
    {"med": "db00682", "effect": "Bleeding", "severity": "high"},
    {"med": "db01050", "effect": "Gastric irritation", "severity": "moderate"},
]

MINI_INTERACTIONS = [
    {
        "meds": ["db00682", "db00945"],
        "effect": "Increased bleeding risk",
        "severity": "high",
    },
    {
        "meds": ["db00945", "db01050"],
        "effect": "Gastrointestinal irritation",
        "severity": "moderate",
    },
    {
        "meds": ["db00682", "db00945", "db01050"],
        "effect": "Elevated bleeding with NSAIDs",
        "severity": "high",
    },
]

SOURCE_VERSION = "HODDI_MINI"


class Command(BaseCommand):
    help = "Seed a minimal HODDI-like dataset for CI/E2E."

    def handle(self, *args, **options):
        self.stdout.write("[-] Seeding mini HODDI dataset...")

        for item in MINI_DRUGS:
            normalized = normalize_medication_name(item["display"])
            MedicationReference.objects.get_or_create(
                identifier=item["identifier"],
                normalized_name=normalized,
                defaults={
                    "display_name": item["display"],
                    "source": "HODDI",
                },
            )

        for item in MINI_SIDE_EFFECTS:
            MedicationSideEffect.objects.get_or_create(
                medication_name=item["med"],
                side_effect=item["effect"],
                source_version=SOURCE_VERSION,
                defaults={
                    "severity": item["severity"],
                    "description": "",
                    "source": "HODDI",
                },
            )

        for item in MINI_INTERACTIONS:
            meds = [normalize_medication_name(m) for m in item["meds"]]
            signature = canonical_signature(meds)
            MedicationInteractionKnowledge.objects.get_or_create(
                combination_signature=signature,
                side_effect=item["effect"],
                source_version=SOURCE_VERSION,
                defaults={
                    "medications": meds,
                    "combination_size": len(meds),
                    "severity": item["severity"],
                    "description": "",
                    "source": "HODDI",
                    "evidence": {},
                },
            )

        self.stdout.write(self.style.SUCCESS("Mini HODDI seed complete."))
