# Password Reset Email Functionality

## Overview
This implementation provides secure password reset functionality via email with token-based verification.

## Features
- **Email-based password reset**: Users receive a secure reset link via email
- **Token expiration**: Reset tokens expire after 1 hour
- **Email enumeration prevention**: Always returns success message regardless of email existence
- **Password validation**: Enforces strong password requirements (12+ chars, special character)
- **Secure token generation**: Uses cryptographically secure random tokens

## API Endpoints

### 1. Request Password Reset
**Endpoint**: `POST /api/auth/password-reset/`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (always 200 to prevent email enumeration):
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Behavior**:
- Generates a secure reset token valid for 1 hour
- Sends email with reset link to the user
- Returns same response whether email exists or not (security feature)

### 2. Confirm Password Reset
**Endpoint**: `POST /api/auth/password-reset/confirm/`

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123!",
  "password_confirm": "NewSecurePassword123!"
}
```

**Success Response** (200):
```json
{
  "message": "Password has been reset successfully."
}
```

**Error Responses** (400):
```json
{
  "token": ["Invalid reset token."]
}
```
```json
{
  "token": ["Reset token has expired."]
}
```
```json
{
  "password": ["Password must be at least 12 characters long."]
}
```
```json
{
  "password_confirm": ["Passwords do not match."]
}
```

## Email Configuration

### Development (Console Backend)
By default, emails are printed to the console for development:
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

### Production (SMTP)
Configure in `.env` file:
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@securemed.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Database Fields
The `User` model includes these fields for password reset:
- `password_reset_token`: Stores the reset token (64 chars)
- `password_reset_expires`: Token expiration timestamp

### Backend Improvements (Phase 3: Implementation & Standardization)
- **Password Reset**: Implemented secure token-based password reset via email. (Assisted by `kiro-cli`)
- **SMS Notifications**: Added SMS reminder logic for appointments and critical alerts.
- **Critical Lab Alerts**: Automated high-priority notifications for "Critical" lab results to both doctors and patients.
- **API Versioning & Standardization**: All endpoints now standardly respond with versioned paths and unified error/pagination formats.

### Backend Improvements (Phase 4: Security)
- **Security Headers**: Configured HSTS, CSP, X-Frame-Options, and Referrer-Policy in `settings.py`.

## Next Steps
1. **Frontend Integration**: Update frontend UI to handle the new password reset and critical alert flows.
2. **Phase 4 - Additional Monitoring**: Implement rate limiting (e.g., `django-ratelimit`) and enhanced logging.

## Security Features

1. **Token Expiration**: Tokens expire after 1 hour
2. **Secure Token Generation**: Uses `secrets.token_urlsafe(32)` for cryptographic security
3. **Email Enumeration Prevention**: Same response for existing and non-existing emails
4. **Password Validation**: 
   - Minimum 12 characters
   - At least 1 special character
5. **Token Cleanup**: Token is cleared after successful password reset
6. **One-time Use**: Token is invalidated after use

## Testing

### Manual Testing
1. Start the development server:
   ```bash
   python manage.py runserver
   ```

2. Request password reset:
   ```bash
   curl -X POST http://localhost:8000/api/auth/password-reset/ \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@securemed.com"}'
   ```

3. Check console output for the reset token

4. Confirm password reset:
   ```bash
   curl -X POST http://localhost:8000/api/auth/password-reset/confirm/ \
     -H "Content-Type: application/json" \
     -d '{
       "token": "TOKEN_FROM_CONSOLE",
       "password": "NewSecurePass123!",
       "password_confirm": "NewSecurePass123!"
     }'
   ```

### Automated Testing
Run the test script:
```bash
python test_password_reset.py
```

## Email Template
The password reset email includes:
- User's name
- Reset link with token
- Expiration notice (1 hour)
- Security notice if request wasn't made by user

## Frontend Integration
The frontend should:
1. Provide a "Forgot Password" form that calls `/api/auth/password-reset/`
2. Create a reset password page at `/reset-password?token=TOKEN`
3. Submit the token and new password to `/api/auth/password-reset/confirm/`
4. Handle success/error responses appropriately

## Error Handling
- Invalid email format: 400 Bad Request
- Invalid token: 400 Bad Request with error message
- Expired token: 400 Bad Request with error message
- Weak password: 400 Bad Request with validation errors
- Mismatched passwords: 400 Bad Request with error message

## Migration
The password reset fields were added in migration:
`authentication/migrations/0007_add_password_reset_fields.py`

If not applied, run:
```bash
python manage.py migrate authentication
```
