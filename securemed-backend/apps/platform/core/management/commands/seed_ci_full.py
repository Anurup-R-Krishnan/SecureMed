from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Seed all core datasets needed for CI/E2E."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("[CI] Seeding full dataset suite..."))

        call_command("seed_db", flush=True)
        call_command("ensure_infection_demo_data")
        call_command("seed_hoddi_mini")

        self.stdout.write(self.style.SUCCESS("[CI] Full seed complete."))
