"""
Management command to process account deletion requests.
Automatically scrubs PII for accounts that requested deletion 30+ days ago.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process account deletion requests (30-day waiting period)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find users who requested deletion 30+ days ago
        cutoff_date = timezone.now() - timedelta(days=30)
        users_to_delete = User.objects.filter(
            deletion_requested_at__isnull=False,
            deletion_requested_at__lte=cutoff_date,
            is_active=True
        )

        count = users_to_delete.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would process {count} account(s) for deletion'
                )
            )
            for user in users_to_delete:
                self.stdout.write(f'  - {user.email} (requested: {user.deletion_requested_at})')
            return

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No accounts to process'))
            return

        deleted_count = 0
        for user in users_to_delete:
            try:
                # Scrub PII
                user.first_name = 'DELETED'
                user.last_name = 'USER'
                user.email = f'deleted_{user.id}@example.com'
                user.username = f'deleted_{user.id}'
                user.is_active = False
                user.save()

                # Log the deletion
                logger.info(f'Processed deletion for user ID {user.id}')
                deleted_count += 1

            except Exception as e:
                logger.error(f'Error processing deletion for user {user.id}: {str(e)}')
                self.stdout.write(
                    self.style.ERROR(f'Error processing user {user.id}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {deleted_count} account deletion(s)'
            )
        )
