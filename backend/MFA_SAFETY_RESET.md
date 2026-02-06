# MFA Safety Reset - Quick Reference

## 🚨 IMMEDIATE FIX

### Step 1: Reset MFA Secret for User ID 2

Open a new terminal in the backend directory and run:

```bash
cd backend
python manage.py shell
```

Then paste this code:

```python
from authentication.models import User
import pyotp

# Reset MFA for user ID 2
user = User.objects.get(id=2)
user.mfa_secret = pyotp.random_base32()
user.mfa_enabled = False
user.save()

print(f"✅ MFA reset for {user.username}")
print(f"New secret: {user.mfa_secret}")
print("\nUser must now:")
print("1. Login (MFA is disabled)")
print("2. Go to MFA setup")
print("3. Scan NEW QR code")
print("4. Verify to re-enable MFA")
```

### Step 2: Test MFA Login

After running the reset, the enhanced logging will now show:

```
[MFA LOGIN] ⚠️  DEVELOPMENT MODE: valid_window=6 (allows ±180 seconds)
[MFA LOGIN] OTP received from client: 673026
[MFA LOGIN] Expected OTP at current time: 631188
[MFA LOGIN] 🎯 MATCH FOUND at interval offset: -5
[MFA LOGIN] 🎯 Time offset: -150 seconds (2.5 minutes)
[MFA LOGIN] 🎯 Client is 150 seconds BEHIND server
```

Or if secret mismatch:

```
[MFA LOGIN] ❌ No match found in range -6 to +6 intervals
[MFA LOGIN] ❌ This suggests a SECRET KEY MISMATCH
[MFA LOGIN] ❌ User may need to re-scan QR code
```

## 📋 What Changed

### 1. Increased Time Window ✅
- **Before**: `valid_window=3` (±90 seconds)
- **After**: `valid_window=6` (±180 seconds / ±3 minutes)
- **Purpose**: Development debugging only

### 2. Interval Offset Detection ✅
- Checks all 13 intervals (-6 to +6)
- Finds exact time offset if OTP matches
- Shows if client is ahead/behind server
- Detects secret key mismatch

### 3. Enhanced Error Messages ✅
- Clear indication of development mode
- Specific tips for troubleshooting
- Emoji indicators for quick scanning

## 🔧 Django Shell Commands

### Quick Reset (One-Liner):
```bash
python manage.py shell -c "from authentication.models import User; import pyotp; u = User.objects.get(id=2); u.mfa_secret = pyotp.random_base32(); u.mfa_enabled = False; u.save(); print(f'Reset: {u.mfa_secret}')"
```

### Check Current OTP:
```bash
python manage.py shell -c "from authentication.models import User; import pyotp; u = User.objects.get(id=2); print(f'Current OTP: {pyotp.TOTP(u.mfa_secret).now()}')"
```

### Disable MFA:
```bash
python manage.py shell -c "from authentication.models import User; u = User.objects.get(id=2); u.mfa_enabled = False; u.save(); print('MFA disabled')"
```

## ⚠️ PRODUCTION WARNING

**Before deploying to production:**

1. Change `valid_window=6` back to `valid_window=2` or `3`
2. Remove development warning messages
3. Remove emoji indicators
4. Ensure all users have synchronized secrets

Large time windows reduce security!

## 📊 Understanding the Output

### Scenario 1: Time Drift
```
🎯 MATCH FOUND at interval offset: -3
🎯 Time offset: -90 seconds (1.5 minutes)
🎯 Client is 90 seconds BEHIND server
```
**Solution**: Sync phone clock or wait for server to catch up

### Scenario 2: Secret Mismatch
```
❌ No match found in range -6 to +6 intervals
❌ This suggests a SECRET KEY MISMATCH
```
**Solution**: Run reset script, user must re-scan QR code

### Scenario 3: Perfect Sync
```
🎯 MATCH FOUND at interval offset: 0
🎯 Time offset: 0 seconds (0.0 minutes)
🎯 Client and server are synchronized
```
**Solution**: Everything is working correctly!

## 🎯 Next Steps

1. **Run the reset script** for user ID 2
2. **Attempt MFA login** and check backend console
3. **Look for interval offset** in the logs
4. **If offset found**: Time drift issue - sync clocks
5. **If no match**: Secret mismatch - user must re-scan QR

The enhanced logging will tell you exactly what's wrong!
