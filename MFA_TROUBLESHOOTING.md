# MFA Login 401 Troubleshooting Guide

## Current Implementation Status

All requested fixes have been implemented in `backend/authentication/views.py`:

### ✅ 1. OTP Window Increased
- **Line 469**: `totp.verify(otp, valid_window=2)`
- Allows ±60 seconds time drift between client and server

### ✅ 2. Detailed Logging in mfa_login_view
The function now prints:
- User ID extracted from temp_token
- Exact OTP received from frontend
- Expected OTP the server generated
- Server timestamp
- OTP verification result (True/False)
- Success/failure status

### ✅ 3. Enhanced verify_temp_token Error Handling
Specific error logging for:
- `jwt.ExpiredSignatureError` - Token expired
- `jwt.InvalidSignatureError` - Key mismatch
- `jwt.DecodeError` - Malformed token
- `jwt.InvalidTokenError` - Generic token issues
- Generic `Exception` - Unexpected errors

### ✅ 4. Frontend Field Names Verified
**File**: `context/auth-context.tsx` (line 117)
```typescript
body: JSON.stringify({ temp_token: tempToken, otp })
```
Matches backend serializer expectations exactly.

## Example Console Output

### Successful Login:
```
======================================================================
[MFA LOGIN] Request received
======================================================================
[MFA LOGIN] Temp token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[MFA LOGIN] OTP code: 123456
[MFA] Token verified successfully for user_id: 5
[MFA LOGIN] Extracted user_id from token: 5
[MFA LOGIN] User found: admin (ID: 5)
[MFA LOGIN] MFA enabled: True
[MFA LOGIN] MFA secret exists: True
[MFA LOGIN] Verifying OTP with valid_window=2 (allows ±60 seconds time drift)
[MFA LOGIN] OTP received from client: 123456
[MFA LOGIN] Expected OTP at current time: 123456
[MFA LOGIN] Server time: 2026-01-31 08:20:36.123456+00:00
[MFA LOGIN] OTP verification result: True
[MFA LOGIN] SUCCESS - Generating JWT tokens for user admin
[MFA LOGIN] Access token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
======================================================================
```

### Failed Login (Wrong OTP):
```
======================================================================
[MFA LOGIN] Request received
======================================================================
[MFA LOGIN] Temp token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[MFA LOGIN] OTP code: 654321
[MFA] Token verified successfully for user_id: 5
[MFA LOGIN] Extracted user_id from token: 5
[MFA LOGIN] User found: admin (ID: 5)
[MFA LOGIN] MFA enabled: True
[MFA LOGIN] MFA secret exists: True
[MFA LOGIN] Verifying OTP with valid_window=2 (allows ±60 seconds time drift)
[MFA LOGIN] OTP received from client: 654321
[MFA LOGIN] Expected OTP at current time: 123456
[MFA LOGIN] Server time: 2026-01-31 08:20:36.123456+00:00
[MFA LOGIN] OTP verification result: False
[MFA LOGIN] FAILED - Invalid OTP code
[MFA LOGIN] OTP mismatch - received '654321' but expected '123456'
======================================================================
```

### Failed Login (Expired Token):
```
======================================================================
[MFA LOGIN] Request received
======================================================================
[MFA LOGIN] Temp token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[MFA LOGIN] OTP code: 123456
[MFA] Token verification failed: Token has expired
[MFA] Error details: Signature has expired
[MFA LOGIN] FAILED - Invalid or expired temporary token
======================================================================
```

## Troubleshooting Steps

### Step 1: Check Backend Console
Watch the Django console for the detailed MFA login flow. The logs will tell you exactly where the failure occurs.

### Step 2: Verify Temp Token
If you see: `[MFA] Token verification failed: Token has expired`
- **Solution**: Temp tokens expire after 5 minutes. Login again to get a new token.

### Step 3: Check OTP Mismatch
If you see: `[MFA LOGIN] OTP mismatch - received 'X' but expected 'Y'`
- **Compare the codes**: The received code is what the frontend sent, expected is what the server calculated
- **Check time sync**: If codes are completely different, your phone and server clocks may be out of sync
- **Wait 30 seconds**: Try the next OTP code from your authenticator app

### Step 4: Verify MFA Configuration
If you see: `[MFA LOGIN] MFA enabled: False` or `MFA secret exists: False`
- **Solution**: Complete MFA setup first via `/api/auth/mfa/setup/` and `/api/auth/mfa/verify/`

### Step 5: Check Request Format
If you see: `[MFA LOGIN] Validation failed:`
- **Solution**: Ensure frontend is sending `temp_token` and `otp` fields (already verified in auth-context.tsx)

## Common Causes of 401 Errors

1. **Expired Temp Token** (5-minute expiration)
   - Solution: Login again to get fresh token

2. **Time Drift** (phone vs server)
   - Solution: valid_window=2 should handle ±60 seconds
   - If still failing, check system clocks

3. **Wrong OTP Code**
   - Solution: Ensure using correct account in authenticator app
   - Wait for next code (30-second refresh)

4. **MFA Not Properly Set Up**
   - Solution: Complete MFA setup flow first

5. **Wrong MFA Secret**
   - Solution: Re-scan QR code in authenticator app

## Testing Checklist

- [ ] Backend server is running and showing console logs
- [ ] Frontend is sending requests to correct endpoint
- [ ] Temp token is valid (not expired)
- [ ] OTP code is current (not expired)
- [ ] User has MFA enabled and secret configured
- [ ] Phone and server time are synchronized
- [ ] Using correct authenticator app account

## Next Steps

1. **Run the backend** and watch console output
2. **Attempt MFA login** from frontend
3. **Read the logs** to identify exact failure point
4. **Share the console output** if issue persists

The logs will show you exactly what's happening at each step of the verification process.
