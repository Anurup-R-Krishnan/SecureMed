from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Seed HODDI interactions (legacy wrapper)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("seed_drug_interactions is deprecated; seeding HODDI dataset instead."))
        call_command("seed_hoddi_mini")
