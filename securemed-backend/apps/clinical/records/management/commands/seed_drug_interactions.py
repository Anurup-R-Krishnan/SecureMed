from django.core.management.base import BaseCommand
from apps.clinical.records.models import DrugInteraction


class Command(BaseCommand):
    help = "Seed common drug interaction pairs"

    def handle(self, *args, **options):
        interactions = [
            ("Warfarin", "Aspirin", "high", "Increased bleeding risk."),
            ("Lisinopril", "Potassium", "moderate", "Risk of hyperkalemia."),
            ("Metformin", "Contrast Dye", "high", "Risk of lactic acidosis."),
            ("Ibuprofen", "Prednisone", "moderate", "Increased GI bleed risk."),
        ]

        created = 0
        for a, b, severity, desc in interactions:
            obj, was_created = DrugInteraction.objects.get_or_create(
                drug_a=a,
                drug_b=b,
                defaults={"severity": severity, "description": desc}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} drug interactions."))
