"""
Django Shell Commands for RBAC Verification

Run these commands in the Django shell:
    python manage.py shell

Then paste the following code:
"""

from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*60)
print("RBAC VERIFICATION - Seeded Roles and User Counts")
print("="*60 + "\n")

# Get all groups (roles)
groups = Group.objects.all()

if not groups.exists():
    print("❌ No groups found! Database seeding may have failed.\n")
else:
    print(f"✅ Found {groups.count()} role(s):\n")
    
    for group in groups:
        user_count = group.user_set.count()
        users = group.user_set.all()
        
        print(f"📋 Role: {group.name}")
        print(f"   Users: {user_count}")
        
        if user_count > 0:
            print("   Members:")
            for user in users:
                print(f"      - {user.username} ({user.email})")
        else:
            print("   Members: None")
        print()

# Total user count
total_users = User.objects.count()
print(f"👥 Total users in system: {total_users}")

# Users without roles
users_without_roles = User.objects.filter(groups__isnull=True).count()
if users_without_roles > 0:
    print(f"⚠️  Users without roles: {users_without_roles}")
else:
    print(f"✅ All users have assigned roles")

print("\n" + "="*60 + "\n")
