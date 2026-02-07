from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from consents.models import Consent, ConsentHistory

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds default consent departments for all users who don\'t have them'

    DEFAULT_DEPARTMENTS = [
        {
            'name': 'Radiology',
            'description': 'Access to X-rays, CT scans, MRI reports, and other imaging studies'
        },
        {
            'name': 'Oncology',
            'description': 'Access to cancer treatment records, chemotherapy protocols, and tumor markers'
        },
        {
            'name': 'Cardiology',
            'description': 'Access to heart-related tests, ECG, echo reports, and cardiac catheterization data'
        },
        {
            'name': 'Neurology',
            'description': 'Access to brain and nervous system evaluations, EEG, and neurological assessments'
        },
        {
            'name': 'Orthopedics',
            'description': 'Access to bone, joint, and musculoskeletal treatment records'
        },
        {
            'name': 'Dermatology',
            'description': 'Access to skin condition records, biopsy results, and dermatological treatments'
        },
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Seed consents for a specific username only'
        )

    def handle(self, *args, **options):
        target_username = options.get('user')
        
        if target_username:
            try:
                users = [User.objects.get(username=target_username)]
                self.stdout.write(f"Seeding consents for user: {target_username}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User '{target_username}' not found"))
                return
        else:
            users = User.objects.all()
            self.stdout.write(f"Seeding consents for {users.count()} users")

        total_created = 0
        total_skipped = 0

        for user in users:
            user_created = 0
            for dept_info in self.DEFAULT_DEPARTMENTS:
                # Check if consent already exists for this user and department
                consent, created = Consent.objects.get_or_create(
                    patient=user,
                    department=dept_info['name'],
                    defaults={
                        'description': dept_info['description'],
                        'is_granted': True,
                    }
                )

                if created:
                    # Create initial history entry
                    ConsentHistory.objects.create(
                        consent=consent,
                        action='GRANTED',
                        actor=user  # Self-granted initially
                    )
                    user_created += 1
                    total_created += 1
                else:
                    total_skipped += 1

            if user_created > 0:
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Created {user_created} consents for {user.username}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'='*50}\n"
                f"Seeding complete!\n"
                f"Created: {total_created} new consents\n"
                f"Skipped: {total_skipped} existing consents\n"
                f"{'='*50}"
            )
        )
