# Database Migration Commands for Invitation System

## Step 1: Create Migration

Run this command to create the migration file for the Invitation model:

```bash
cd backend
python manage.py makemigrations authentication
```

**Expected Output:**
```
Migrations for 'authentication':
  authentication\migrations\000X_invitation.py
    - Create model Invitation
```

## Step 2: Apply Migration

Run this command to apply the migration to the database:

```bash
python manage.py migrate authentication
```

**Expected Output:**
```
Operations to perform:
  Apply all migrations: authentication
Running migrations:
  Applying authentication.000X_invitation... OK
```

## Step 3: Verify Migration

You can verify the migration was successful by checking the database:

```bash
python manage.py shell
```

Then run:
```python
from authentication.models import Invitation
print(Invitation.objects.count())  # Should return 0 (no invitations yet)
```

---

## Alternative: Apply All Migrations

If you want to apply all pending migrations at once:

```bash
python manage.py migrate
```

This will apply migrations for all apps, including the new Invitation model.

---

## Rollback (If Needed)

If you need to rollback the migration:

```bash
python manage.py migrate authentication <previous_migration_name>
```

To see migration history:
```bash
python manage.py showmigrations authentication
```
