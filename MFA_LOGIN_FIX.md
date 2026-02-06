# MFA Login 401 Error - Fix Documentation

## Problem
Users were experiencing 401 Unauthorized errors when attempting to complete MFA login, even with correct OTP codes. The issue was caused by:
1. Tight OTP time window (`valid_window=1`) not accounting for time drift between client and server
2. Insufficient error logging making it difficult to diagnose token verification failures
3. No visibility into the MFA login flow for debugging

## Solution Applied

### 1. Increased OTP Validation Window ✅
**File**: `backend/authentication/views.py` - `mfa_login_view`

**Before**:
```python
if totp.verify(otp, valid_window=1):
```

**After**:
```python
otp_valid = totp.verify(otp, valid_window=2)
```

**Impact**: 
- `valid_window=1` allows ±30 seconds time drift
- `valid_window=2` allows ±60 seconds time drift
- This accommodates clock differences between phone and server

### 2. Enhanced Token Verification Error Logging ✅
**File**: `backend/authentication/views.py` - `verify_temp_token`

**Added specific error handling for**:
- `jwt.ExpiredSignatureError` - Token has expired
- `jwt.InvalidSignatureError` - Key mismatch or tampering
- `jwt.DecodeError` - Malformed token
- `jwt.InvalidTokenError` - Generic token issues
- Generic `Exception` - Unexpected errors

**Each error now prints**:
- Clear error category
- Error type name
- Detailed error message

**Example output**:
```
[MFA] Token verification failed: Token has expired
[MFA] Error details: Signature has expired
```

### 3. Comprehensive MFA Login Flow Logging ✅
**File**: `backend/authentication/views.py` - `mfa_login_view`

**Added debug logging for**:
- Request received notification
- Serializer validation results
- Temp token preview (first 30 chars)
- OTP code received
- User ID extraction from token
- User lookup results (username, ID, MFA status)
- OTP verification window setting
- OTP verification result (True/False)
- JWT token generation
- Current server time on failure
- Expected OTP code on failure

**Example successful flow**:
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
[MFA LOGIN] OTP verification result: True
[MFA LOGIN] SUCCESS - Generating JWT tokens for user admin
[MFA LOGIN] Access token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
======================================================================
```

**Example failure flow**:
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
[MFA LOGIN] OTP verification result: False
[MFA LOGIN] FAILED - Invalid OTP code
[MFA LOGIN] Current server time: 2026-01-31 08:15:41.123456+00:00
[MFA LOGIN] Expected OTP at current time: 789012
======================================================================
```

### 4. Verified Serializer Coordination ✅
**File**: `backend/authentication/serializers.py` - `MFALoginSerializer`

Confirmed that serializer fields match exactly with view expectations:
- `temp_token` - CharField for temporary MFA token
- `otp` - CharField (6 digits) for TOTP code

No changes needed - fields are correctly defined.

## Testing the Fix

### 1. Monitor Backend Logs
Watch the Django console for detailed MFA login flow:
```bash
cd backend
python manage.py runserver
```

### 2. Test MFA Login
1. Login with MFA-enabled account
2. Receive temporary token
3. Enter OTP code from authenticator app
4. Check backend console for detailed flow

### 3. Diagnose Issues
If login still fails, check the logs for:
- **Token verification errors**: Look for `[MFA] Token verification failed:`
- **User lookup issues**: Check `[MFA LOGIN] User found:` line
- **MFA configuration**: Verify `MFA enabled:` and `MFA secret exists:` are both True
- **OTP validation**: Check `OTP verification result:` and compare with `Expected OTP at current time:`

## Common Issues and Solutions

### Issue: Token Expired
**Log**: `[MFA] Token verification failed: Token has expired`
**Solution**: Temporary tokens expire after 5 minutes. Request a new token by logging in again.

### Issue: Invalid Signature
**Log**: `[MFA] Token verification failed: Invalid signature`
**Solution**: Check that `settings.SECRET_KEY` hasn't changed between token generation and verification.

### Issue: OTP Still Invalid with valid_window=2
**Log**: `[MFA LOGIN] OTP verification result: False`
**Solution**: 
1. Check server time vs phone time (should be within ±60 seconds)
2. Verify the OTP code is from the correct account in authenticator app
3. Check the `Expected OTP at current time:` in logs to see what the server expects

### Issue: MFA Not Enabled
**Log**: `[MFA LOGIN] FAILED - MFA not properly configured`
**Solution**: User needs to complete MFA setup first via `/api/auth/mfa/setup/` and `/api/auth/mfa/verify/`

## Files Modified

- ✅ `backend/authentication/views.py`
  - Enhanced `verify_temp_token()` with detailed error logging
  - Updated `mfa_login_view()` with `valid_window=2` and comprehensive debug logging

## API Behavior

**Endpoint**: `POST /api/auth/mfa/login/`

**Request**:
```json
{
  "temp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "otp": "123456"
}
```

**Success Response** (200):
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "mfa_enabled": true
  }
}
```

**Error Responses**:
- **401**: Invalid or expired temp token, or invalid OTP
- **400**: Validation errors or MFA not enabled
- **404**: User not found

## Time Window Explanation

With `valid_window=2`:
- TOTP codes change every 30 seconds
- Server accepts codes from:
  - 2 periods ago (-60 seconds)
  - 1 period ago (-30 seconds)
  - Current period (0 seconds)
  - 1 period ahead (+30 seconds)
  - 2 periods ahead (+60 seconds)
- Total acceptance window: 150 seconds (2.5 minutes)

This is more than sufficient for typical clock drift scenarios.
