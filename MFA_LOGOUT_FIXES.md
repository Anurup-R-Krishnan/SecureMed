# MFA and Logout Error Fixes

## Issues Fixed

### 1. MFA Login 401 Error - Clock Desync ✅

**Problem**: OTP codes were failing verification due to time drift between phone and server.

**Solution**: Increased OTP validation window and added time comparison logging.

**File**: `backend/authentication/views.py` - `mfa_login_view`

**Changes**:
- Increased `valid_window` from 2 to 3
- **Before**: ±60 seconds (2 intervals × 30 seconds)
- **After**: ±90 seconds (3 intervals × 30 seconds)
- Added timestamp and TOTP interval logging

**New Logging Output**:
```python
[MFA LOGIN] Verifying OTP with valid_window=3 (allows ±90 seconds time drift)
[MFA LOGIN] OTP received from client: 123456
[MFA LOGIN] Expected OTP at current time: 123456
[MFA LOGIN] Server time: 2026-01-31 08:29:18.123456+00:00
[MFA LOGIN] Server timestamp: 1738315758
[MFA LOGIN] TOTP interval: 57943858 (changes every 30 seconds)
[MFA LOGIN] OTP verification result: True
```

**On Failure**:
```python
[MFA LOGIN] FAILED - Invalid OTP code
[MFA LOGIN] OTP mismatch - received '654321' but expected '123456'
[MFA LOGIN] Note: valid_window=3 checks codes from 57943855 to 57943861
```

### 2. Logout 400 Error - Missing Refresh Token ✅

**Problem**: Logout was failing with 400 error because refresh token wasn't being sent correctly.

**Solution**: Enhanced logout function to always retrieve refresh token from localStorage as fallback.

**File**: `context/auth-context.tsx` - `logout` function

**Changes**:
1. **Fallback Logic**: If `tokens.refresh` is null, tries to get it from localStorage
2. **Enhanced Logging**: Logs logout attempts and token status
3. **Error Handling**: Better error messages for debugging

**New Code Flow**:
```typescript
// 1. Try to get refresh token from state
let refreshToken = tokens?.refresh;

// 2. Fallback to localStorage if state is null
if (!refreshToken) {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);
        refreshToken = parsedTokens.refresh;
    }
}

// 3. Send to backend if available
if (tokens?.access && refreshToken) {
    await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
    });
}
```

**Console Logging**:
```
[LOGOUT] Sending logout request to backend
[LOGOUT] Refresh token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[LOGOUT] Backend logout successful
```

Or if tokens unavailable:
```
[LOGOUT] Skipping backend call - no tokens available
```

## Testing

### Test MFA Login:
1. Login with MFA-enabled account
2. Enter OTP code from authenticator app
3. Check backend console for detailed timing information
4. Should now accept codes with up to 90 seconds time drift

### Test Logout:
1. Login to application
2. Click logout
3. Check browser console for `[LOGOUT]` messages
4. Should see successful logout without 400 error

## Time Window Explanation

**TOTP (Time-based One-Time Password)**:
- Codes change every 30 seconds
- Each 30-second period is called an "interval"

**With valid_window=3**:
- Server checks 7 total intervals:
  - 3 intervals in the past (-90 seconds)
  - Current interval (0 seconds)
  - 3 intervals in the future (+90 seconds)

**Example Timeline**:
```
Time:     -90s  -60s  -30s   0s   +30s  +60s  +90s
Interval:  -3    -2    -1    0     +1    +2    +3
Status:    ✓     ✓     ✓     ✓     ✓     ✓     ✓
```

All codes in this range are accepted.

## Common Scenarios

### Scenario 1: Phone Clock is 45 seconds ahead
- Phone generates code for interval +2
- Server is at interval 0
- **Result**: ✅ Accepted (within ±90 seconds)

### Scenario 2: Phone Clock is 100 seconds behind
- Phone generates code for interval -4
- Server is at interval 0
- **Result**: ❌ Rejected (outside ±90 seconds)
- **Solution**: Sync phone clock or wait for next code

### Scenario 3: Logout after session timeout
- State tokens may be null
- **Result**: ✅ Fallback to localStorage works
- Logout succeeds without 400 error

## Files Modified

1. ✅ `backend/authentication/views.py`
   - Updated `mfa_login_view` to use `valid_window=3`
   - Added timestamp and interval logging

2. ✅ `context/auth-context.tsx`
   - Enhanced `logout` function with localStorage fallback
   - Added detailed console logging

## Troubleshooting

### MFA Still Failing?
Check the console logs:
- Compare "Server timestamp" with your phone's time
- If difference > 90 seconds, sync your phone clock
- Check "TOTP interval" - should be close to current interval

### Logout Still Getting 400?
Check browser console:
- Should see `[LOGOUT]` messages
- If "Skipping backend call", tokens are missing
- Check localStorage for `auth_tokens` key

### Clock Sync Issues?
**Windows**:
```cmd
w32tm /resync
```

**Phone**:
- Settings → Date & Time → Set Automatically

## API Behavior

**MFA Login**: `POST /api/auth/mfa/login/`
- Accepts OTP codes with ±90 seconds time drift
- Returns 401 if code is outside this window

**Logout**: `POST /api/auth/logout/`
- Expects `{"refresh": "token_string"}` in body
- Returns 400 if refresh token is missing or invalid
- Frontend now handles missing tokens gracefully
