# Invitation System Verification Guide

## Quick Start

Run the verification script to test the complete invitation flow:

```bash
cd backend
python verify_invitations.py
```

## What the Script Does

### Step 1: Admin Authentication
- Logs in as `admin@example.com` with password `etturvattam`
- **If MFA is enabled**: Prompts you to enter your 6-digit OTP code
- Retrieves admin access token

### Step 2: Send Invitation
- Uses admin token to send invitation to `automated-test@example.com`
- If invitation already exists, retrieves the existing token
- Displays invitation details (token, email, expiration)

### Step 3: Verify Token
- Calls `/api/auth/invite/verify/` with the token
- Confirms token is valid, unused, and not expired
- Verifies email matches the invitation

### Step 4: Output Registration URL
- Generates the full registration URL with token
- Example: `http://localhost:3000/register?token=<uuid>`
- You can click this link to test the frontend registration flow

## Expected Output

```
======================================================================
INVITATION SYSTEM VERIFICATION - Story 1.4
======================================================================

Step 1: Authenticating as admin...
   Email: admin@example.com
🔐 MFA is enabled for this account
   Temporary token received: eyJhbGciOiJIUzI1NiIsInR5cCI6...

📱 Please enter your 6-digit OTP code from your authenticator app:
   OTP: 123456

   Verifying OTP...
✅ MFA verification successful!
   Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Step 2: Sending invitation...
   To: automated-test@example.com
✅ Invitation sent successfully!
   Token: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Email: automated-test@example.com
   Expires: 2026-02-02T12:12:08Z

Step 3: Verifying invitation token...
   Token: a1b2c3d4-e5f6-7890-abcd-ef1234567890
✅ Token verification successful!
   Valid: True
   Email: automated-test@example.com
   Message: Invitation is valid

Step 4: Registration URL
======================================================================

🔗 Registration Link:
   http://localhost:3000/register?token=a1b2c3d4-e5f6-7890-abcd-ef1234567890

📋 Instructions:
   1. Click the link above (or copy-paste into your browser)
   2. The registration form should load with email pre-filled
   3. Email field should show: automated-test@example.com
   4. Complete the form to test the full registration flow

======================================================================
✅ VERIFICATION COMPLETE - All checks passed!
======================================================================

📊 Summary:
   ✅ Admin authentication successful
   ✅ Invitation created/retrieved
   ✅ Token validation passed
   ✅ Registration URL generated

   Invitation Email: automated-test@example.com
   Token: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Status: Ready for registration
```

## Testing the Full Flow

After running the script:

1. **Copy the registration URL** from the output
2. **Open it in your browser** (frontend must be running on port 3000)
3. **Verify the registration page**:
   - ✅ Email is pre-filled with `automated-test@example.com`
   - ✅ Email field is read-only (disabled)
   - ✅ "I am not a robot" CAPTCHA checkbox is present
   - ✅ Form is enabled and ready for input

4. **Complete registration**:
   - Enter username
   - Enter password (min 12 chars, 1 special char)
   - Confirm password
   - Select role (Patient or Doctor)
   - Check CAPTCHA checkbox
   - Click "Create Account"

5. **Verify backend logs**:
   - Check the backend console for audit log output
   - Should show IP address, timestamp, and registration status

## Troubleshooting

### Connection Error
```
❌ Connection error. Make sure the backend server is running:
   python manage.py runserver
```
**Solution**: Start the Django backend server

### MFA Required
If you see the MFA prompt, you'll need your authenticator app to get the 6-digit code.

**If you don't have MFA set up**:
1. Use a different admin account without MFA
2. Or update the script credentials to use a non-MFA admin

### Invitation Already Exists
```
⚠️  An active invitation already exists for this email
   Using existing token: <uuid>
```
This is normal - the script will reuse the existing invitation token.

### Invalid Token
If token verification fails, the invitation may have expired (48-hour limit).
Run the script again to generate a new invitation.

## Manual Testing

You can also test the endpoints manually:

### Send Invitation (Admin Only)
```bash
curl -X POST http://localhost:8000/api/auth/invite/send/ \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Verify Token (Public)
```bash
curl -X POST http://localhost:8000/api/auth/invite/verify/ \
  -H "Content-Type: application/json" \
  -d '{"token": "<uuid-token>"}'
```

### Register with Token
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "patient",
    "token": "<uuid-token>",
    "captcha_token": true
  }'
```

## Notes

- The script uses `automated-test@example.com` as the test email
- Invitations expire after 48 hours
- Each invitation can only be used once
- The frontend must be running on `http://localhost:3000`
- The backend must be running on `http://localhost:8000`
