# Password Reset Quick Reference

## Implementation Summary

### Files Modified/Created:

1. **authentication/serializers.py**
   - Added `PasswordResetRequestSerializer`
   - Added `PasswordResetConfirmSerializer`

2. **authentication/views.py**
   - Updated `PasswordResetRequestView` to send emails
   - Added `PasswordResetConfirmView` for token confirmation

3. **authentication/urls.py**
   - Added `password-reset/confirm/` endpoint

4. **config/settings.py**
   - Added email configuration settings
   - Added `FRONTEND_URL` setting

5. **.env**
   - Added email configuration variables

6. **docs/PASSWORD_RESET.md**
   - Complete documentation

7. **test_password_reset.py**
   - Test script for validation

## Quick Test Commands

### 1. Request Password Reset
```bash
curl -X POST http://localhost:8000/api/auth/password-reset/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@securemed.com"}'
```

### 2. Confirm Password Reset (use token from console)
```bash
curl -X POST http://localhost:8000/api/auth/password-reset/confirm/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE",
    "password": "NewSecurePass123!",
    "password_confirm": "NewSecurePass123!"
  }'
```

## Key Features

✓ Secure token generation (cryptographically secure)
✓ Token expiration (1 hour)
✓ Email enumeration prevention
✓ Strong password validation
✓ Email notifications
✓ Console backend for development
✓ SMTP support for production

## Security Considerations

- Tokens are single-use and expire after 1 hour
- Same response for existing/non-existing emails (prevents enumeration)
- Password must be 12+ characters with special character
- Token is cleared after successful reset
- Uses `secrets.token_urlsafe()` for secure token generation

## Production Deployment

Update `.env` with real SMTP credentials:
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@securemed.com
FRONTEND_URL=https://your-production-domain.com
```

For Gmail, use an App Password:
https://support.google.com/accounts/answer/185833
