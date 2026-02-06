# Database Migration for Recovery Codes

## Migration Required

The `mfa_recovery_codes` JSONField has been added to the User model.

## Run Migration Commands

```bash
cd backend
python manage.py makemigrations authentication
python manage.py migrate
```

## Expected Output

```
Migrations for 'authentication':
  authentication/migrations/XXXX_add_mfa_recovery_codes.py
    - Add field mfa_recovery_codes to user

Operations to perform:
  Apply all migrations: authentication
Running migrations:
  Applying authentication.XXXX_add_mfa_recovery_codes... OK
```

## Verification

After migration, verify the field was added:

```bash
python manage.py shell
```

```python
from authentication.models import User
user = User.objects.first()
print(user.mfa_recovery_codes)  # Should print: None or []
```

## Important Notes

- Existing users will have `mfa_recovery_codes = None` or `[]`
- Recovery codes are only generated when MFA is enabled/verified
- Codes are hashed using Django's `make_password()`
- Each code is single-use and deleted after successful login
