# MFA Secret Reset Script for User ID 2

## Quick Django Shell Commands

### Option 1: Reset MFA Secret (User Must Re-scan QR Code)

Run this in Django shell to completely reset MFA for user ID 2:

```bash
cd backend
python manage.py shell
```

Then paste this code:

```python
from authentication.models import User
import pyotp

# Get user ID 2
user = User.objects.get(id=2)

# Generate new MFA secret
new_secret = pyotp.random_base32()

# Update user's MFA secret
user.mfa_secret = new_secret
user.mfa_enabled = False  # Disable MFA so user can set it up again
user.save()

# Generate provisioning URI for QR code
totp = pyotp.TOTP(new_secret)
provisioning_uri = totp.provisioning_uri(
    name=user.email,
    issuer_name='SecureMed'
)

print("="*70)
print("MFA SECRET RESET SUCCESSFUL")
print("="*70)
print(f"User: {user.username} (ID: {user.id})")
print(f"Email: {user.email}")
print(f"New Secret: {new_secret}")
print(f"MFA Enabled: {user.mfa_enabled}")
print()
print("NEXT STEPS:")
print("1. User must login without MFA (it's now disabled)")
print("2. User must go to MFA setup page")
print("3. User must scan the NEW QR code")
print("4. User must verify with OTP to re-enable MFA")
print()
print("Provisioning URI (for manual entry):")
print(provisioning_uri)
print("="*70)
```

### Option 2: View Current MFA Secret (Debug Only)

To check what secret is currently stored:

```python
from authentication.models import User
import pyotp

user = User.objects.get(id=2)

print("="*70)
print("CURRENT MFA CONFIGURATION")
print("="*70)
print(f"User: {user.username} (ID: {user.id})")
print(f"Email: {user.email}")
print(f"MFA Enabled: {user.mfa_enabled}")
print(f"MFA Secret: {user.mfa_secret}")
print()

if user.mfa_secret:
    totp = pyotp.TOTP(user.mfa_secret)
    current_otp = totp.now()
    print(f"Current OTP (server): {current_otp}")
    print()
    print("If this doesn't match your phone, the secrets are out of sync!")
    print()
    print("Provisioning URI:")
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name='SecureMed'
    )
    print(provisioning_uri)
else:
    print("No MFA secret configured")
print("="*70)
```

### Option 3: Disable MFA Temporarily

To disable MFA without changing the secret:

```python
from authentication.models import User

user = User.objects.get(id=2)
user.mfa_enabled = False
user.save()

print(f"MFA disabled for {user.username}")
print("User can now login without OTP")
```

### Option 4: Test OTP Code

To test if a specific OTP code is valid:

```python
from authentication.models import User
import pyotp

user = User.objects.get(id=2)
totp = pyotp.TOTP(user.mfa_secret)

# Replace with the code from your phone
test_code = "123456"

# Test with different windows
for window in [1, 3, 6, 10]:
    is_valid = totp.verify(test_code, valid_window=window)
    print(f"valid_window={window}: {is_valid}")

# Show current expected code
print(f"\nCurrent expected code: {totp.now()}")

# Show codes for next few intervals
import time
current_time = int(time.time())
print("\nCodes for next 5 intervals:")
for i in range(5):
    future_time = current_time + (i * 30)
    future_code = totp.at(future_time)
    print(f"  +{i*30}s: {future_code}")
```

## One-Liner Commands

### Reset MFA for User ID 2:
```bash
python manage.py shell -c "from authentication.models import User; import pyotp; u = User.objects.get(id=2); u.mfa_secret = pyotp.random_base32(); u.mfa_enabled = False; u.save(); print(f'Reset complete. New secret: {u.mfa_secret}')"
```

### Disable MFA for User ID 2:
```bash
python manage.py shell -c "from authentication.models import User; u = User.objects.get(id=2); u.mfa_enabled = False; u.save(); print('MFA disabled')"
```

### Check Current OTP:
```bash
python manage.py shell -c "from authentication.models import User; import pyotp; u = User.objects.get(id=2); print(f'Current OTP: {pyotp.TOTP(u.mfa_secret).now()}')"
```

## Troubleshooting

### If OTP Still Doesn't Match After Reset:

1. **Check Server Time**:
   ```bash
   python manage.py shell -c "import time; from django.utils import timezone; print(f'Server time: {timezone.now()}'); print(f'Unix timestamp: {int(time.time())}')"
   ```

2. **Check Phone Time**:
   - Go to Settings → Date & Time
   - Enable "Set Automatically"
   - Ensure timezone is correct

3. **Verify Secret in Authenticator App**:
   - Delete old SecureMed entry
   - Scan new QR code after reset
   - Ensure account name matches user email

4. **Test Time Sync**:
   - Visit https://time.is on your phone
   - Compare with server time
   - Should be within a few seconds

### Common Issues:

**Issue**: "User matching query does not exist"
- **Solution**: User ID 2 doesn't exist. Check with:
  ```python
  from authentication.models import User
  User.objects.all().values_list('id', 'username', 'email')
  ```

**Issue**: Reset works but OTP still fails
- **Solution**: Secret key mismatch. User must:
  1. Delete old entry in authenticator app
  2. Scan NEW QR code from fresh MFA setup
  3. Verify the account name matches

**Issue**: valid_window=6 still fails
- **Solution**: Not a time issue - secret keys don't match
- Run Option 1 to completely reset MFA

## After Reset

1. User logs in (MFA is now disabled)
2. User goes to MFA setup page
3. User scans the NEW QR code
4. User verifies with OTP
5. MFA is re-enabled with correct secret

## Production Note

⚠️ **IMPORTANT**: The `valid_window=6` setting in `mfa_login_view` is for DEVELOPMENT ONLY.

Before deploying to production:
1. Change `valid_window=6` back to `valid_window=2` or `valid_window=3`
2. Remove development warning messages
3. Ensure all users have synchronized secrets

Large time windows (±3 minutes) reduce security and should only be used for debugging.
