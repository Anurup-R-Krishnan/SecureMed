from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Permanently scrub PII from users who requested deletion > 30 days ago'

    def handle(self, *args, **options):
        # 1. Calculate cutoff (30 days ago)
        cutoff = timezone.now() - timedelta(days=30)
        
        self.stdout.write(f"Searching for users requesting deletion before {cutoff}...")

        # 2. Find eligible users
        users = User.objects.filter(
            deletion_requested_at__lte=cutoff,
            is_active=False
        )
        
        if not users.exists():
            self.stdout.write(self.style.WARNING("No users found pending permanent deletion."))
            return

        count = 0
        for user in users:
            self.stdout.write(f"Scrubbing user ID {user.id} (formerly {user.email})...")
            
            # 3. Anonymize PII (The "Hard Delete" logic)
            user.username = f"deleted_{user.id}_{uuid.uuid4().hex[:8]}"
            user.email = f"deleted_{user.id}_{uuid.uuid4().hex[:8]}@scrubbed.local"
            user.first_name = "Deleted"
            user.last_name = "User"
            
            # Security wipe
            user.set_unusable_password()
            user.mfa_secret = None
            user.mfa_enabled = False
            user.mfa_recovery_codes = []
            
            # Clear the request timestamp
            user.deletion_requested_at = None
            
            user.save()
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f"✓ Successfully scrubbed {count} users."))
