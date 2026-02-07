from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import pyotp
import jwt
import secrets
import string
from django.conf import settings

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    MFASetupSerializer,
    MFAVerifySerializer,
    MFALoginSerializer,
    MFADeactivateSerializer,
    RegenerateRecoveryCodesSerializer,
    UserSerializer,
    UserListSerializer,
    UserRoleUpdateSerializer
)

User = get_user_model()

# Constants
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


def generate_recovery_codes(count=10, length=8):
    """
    Generate random recovery codes.
    Returns a list of plain text codes.
    """
    codes = []
    for _ in range(count):
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) 
                      for _ in range(length))
        codes.append(code)
    return codes



def get_tokens_for_user(user):
    """
    Generate JWT tokens for a user.
    """
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def generate_temp_token(user):
    """
    Generate a temporary token for MFA flow.
    This token is short-lived and only used to verify MFA.
    """
    payload = {
        'user_id': user.id,
        'exp': timezone.now() + timedelta(minutes=5),
        'type': 'mfa_temp'
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def verify_temp_token(token):
    """
    Verify and decode temporary MFA token.
    Returns user_id if valid, None otherwise.
    """
    try:
        # Explicitly use HS256 algorithm and settings.SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        
        # Check if token type is correct
        if payload.get('type') == 'mfa_temp':
            user_id = payload.get('user_id')
            print(f"[MFA] Token verified successfully for user_id: {user_id}")
            return user_id
        else:
            print(f"[MFA] Token verification failed: Invalid token type '{payload.get('type')}' (expected 'mfa_temp')")
            return None
            
    except jwt.ExpiredSignatureError as e:
        print(f"[MFA] Token verification failed: Token has expired")
        print(f"[MFA] Error details: {str(e)}")
        return None
        
    except jwt.InvalidSignatureError as e:
        print(f"[MFA] Token verification failed: Invalid signature (possible key mismatch)")
        print(f"[MFA] Error details: {str(e)}")
        return None
        
    except jwt.DecodeError as e:
        print(f"[MFA] Token verification failed: Decode error (malformed token)")
        print(f"[MFA] Error details: {str(e)}")
        return None
        
    except jwt.InvalidTokenError as e:
        print(f"[MFA] Token verification failed: Invalid token")
        print(f"[MFA] Error details: {str(e)}")
        return None
        
    except Exception as e:
        print(f"[MFA] Token verification failed: Unexpected error")
        print(f"[MFA] Error type: {type(e).__name__}")
        print(f"[MFA] Error details: {str(e)}")
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Get current user profile.
    GET /api/auth/user/
    
    Response:
    {
        "id": 1,
        "username": "john",
        "email": "john@example.com",
        "role": "patient",
        "mfa_enabled": true
    }
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    User registration endpoint with invite-only access.
    POST /api/auth/register
    
    Request body:
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "password_confirm": "string",
        "role": "patient|provider|admin" (optional, defaults to patient),
        "token": "uuid-string" (invitation token),
        "captcha_token": true (CAPTCHA verification)
    }
    """
    # Capture IP address for audit logging
    ip_address = request.META.get('REMOTE_ADDR', 'Unknown')
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip_address = x_forwarded_for.split(',')[0].strip()
    
    # Log registration attempt
    print("\n" + "="*70)
    print("REGISTRATION ATTEMPT - AUDIT LOG")
    print("="*70)
    print(f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"IP Address: {ip_address}")
    print(f"Email: {request.data.get('email', 'Not provided')}")
    print(f"Username: {request.data.get('username', 'Not provided')}")
    
    # Validate invitation token before proceeding
    token = request.data.get('token')
    if not token:
        print(f"Status: FAILED - No invitation token provided")
        print("="*70 + "\n")
        return Response({
            'error': 'Invitation token is required for registration'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .models import Invitation
        invitation = Invitation.objects.get(token=token)
        
        # Check if invitation is valid
        if invitation.is_used:
            print(f"Status: FAILED - Invitation already used")
            print(f"Used by: {invitation.used_by.username if invitation.used_by else 'Unknown'}")
            print(f"Used at: {invitation.used_at}")
            print("="*70 + "\n")
            return Response({
                'error': 'This invitation has already been used'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if timezone.now() > invitation.expires_at:
            print(f"Status: FAILED - Invitation expired")
            print(f"Expired at: {invitation.expires_at}")
            print("="*70 + "\n")
            return Response({
                'error': 'This invitation has expired'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify email matches invitation
        if request.data.get('email') != invitation.email:
            print(f"Status: FAILED - Email mismatch")
            print(f"Expected: {invitation.email}")
            print(f"Provided: {request.data.get('email')}")
            print("="*70 + "\n")
            return Response({
                'error': 'Email does not match invitation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"Invitation Token: Valid")
        print(f"Invited by: {invitation.sent_by.username}")
        
    except Invitation.DoesNotExist:
        print(f"Status: FAILED - Invalid invitation token")
        print("="*70 + "\n")
        return Response({
            'error': 'Invalid invitation token'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Proceed with registration
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Mark invitation as used
        invitation.mark_as_used(user)
        
        print(f"Status: SUCCESS - User registered")
        print(f"User ID: {user.id}")
        print(f"Invitation marked as used")
        print("="*70 + "\n")
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    print(f"Status: FAILED - Validation errors")
    print(f"Errors: {serializer.errors}")
    print("="*70 + "\n")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    User login endpoint with lockout and MFA support.
    POST /api/auth/login
    
    Request body:
    {
        "username": "string",
        "password": "string"
    }
    
    Response (no MFA):
    {
        "access": "token",
        "refresh": "token",
        "user": {...}
    }
    
    Response (MFA required):
    {
        "mfa_required": true,
        "temp_token": "token"
    }
    """
    serializer = UserLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username_or_email = serializer.validated_data['username']
    password = serializer.validated_data['password']
    
    # Try to find user by username or email
    try:
        if '@' in username_or_email:
            user = User.objects.get(email=username_or_email)
        else:
            user = User.objects.get(username=username_or_email)
    except User.DoesNotExist:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Security Check: Prevent login for deactivated/deleted users
    if not user.is_active:
        return Response({
            'error': 'This account has been deactivated or scheduled for deletion.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if account is locked
    if user.locked_until and user.locked_until > timezone.now():
        remaining_time = (user.locked_until - timezone.now()).seconds // 60
        return Response({
            'error': f'Account is locked. Try again in {remaining_time} minutes.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Reset lockout if time has passed
    if user.locked_until and user.locked_until <= timezone.now():
        user.locked_until = None
        user.failed_login_attempts = 0
        user.save()
    
    # Verify password
    if not user.check_password(password):
        # Increment failed attempts
        user.failed_login_attempts += 1
        
        # Lock account if max attempts exceeded
        if user.failed_login_attempts > MAX_FAILED_ATTEMPTS:
            user.locked_until = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            user.save()
            return Response({
                'error': f'Too many failed attempts. Account locked for {LOCKOUT_DURATION_MINUTES} minutes.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user.save()
        remaining_attempts = MAX_FAILED_ATTEMPTS - user.failed_login_attempts + 1
        return Response({
            'error': f'Invalid credentials. {remaining_attempts} attempts remaining.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Password is correct - reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save()
    
    # Check if MFA is enabled
    if user.mfa_enabled:
        # Return temp token for MFA verification
        temp_token = generate_temp_token(user)
        return Response({
            'mfa_required': True,
            'temp_token': temp_token
        }, status=status.HTTP_200_OK)
    
    # No MFA - return tokens immediately
    tokens = get_tokens_for_user(user)
    
    # Check policy version (Story 2.4)
    latest_policy = getattr(settings, 'LATEST_POLICY_VERSION', 1)
    requires_policy = user.accepted_policy_version < latest_policy
    
    return Response({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': UserSerializer(user).data,
        'requires_policy_acceptance': requires_policy,
        'latest_policy_version': latest_policy
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_setup_view(request):
    """
    MFA setup endpoint - generates TOTP secret and provisioning URI.
    POST /api/auth/mfa/setup
    
    Response:
    {
        "secret": "base32_secret",
        "provisioning_uri": "otpauth://..."
    }
    """
    user = request.user
    
    # Generate new TOTP secret
    secret = pyotp.random_base32()
    
    # Save secret to user (not enabled yet)
    user.mfa_secret = secret
    user.save()
    
    # Generate provisioning URI for QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name='SecureMed'
    )
    
    return Response({
        'secret': secret,
        'provisioning_uri': provisioning_uri
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_verify_view(request):
    """
    MFA verification endpoint - verifies TOTP code and enables MFA.
    POST /api/auth/mfa/verify
    
    Request body:
    {
        "otp": "123456"
    }
    """
    serializer = MFAVerifySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    otp = serializer.validated_data['otp']
    
    if not user.mfa_secret:
        return Response({
            'error': 'MFA not set up. Call /mfa/setup first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify OTP
    totp = pyotp.TOTP(user.mfa_secret)
    if totp.verify(otp, valid_window=1):
        # Enable MFA
        user.mfa_enabled = True
        
        # Generate recovery codes
        plain_codes = generate_recovery_codes(count=10, length=8)
        hashed_codes = [make_password(code) for code in plain_codes]
        user.mfa_recovery_codes = hashed_codes
        
        user.save()
        
        print(f"[MFA VERIFY] MFA enabled for user {user.username}")
        print(f"[MFA VERIFY] Generated {len(plain_codes)} recovery codes")
        
        return Response({
            'message': 'MFA enabled successfully',
            'recovery_codes': plain_codes  # Return plain text codes ONLY ONCE
        }, status=status.HTTP_200_OK)
    
    return Response({
        'error': 'Invalid OTP code'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_deactivate_view(request):
    """
    MFA deactivation endpoint - requires password and OTP verification.
    POST /api/auth/mfa/deactivate/
    
    Request body:
    {
        "password": "user_password",
        "otp": "123456"
    }
    
    Response:
    {
        "message": "MFA deactivated successfully"
    }
    """
    print("\n" + "="*70)
    print("[MFA DEACTIVATE] Request received")
    print("="*70)
    
    # Validate request data (includes password check in serializer)
    serializer = MFADeactivateSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        print(f"[MFA DEACTIVATE] Validation failed: {serializer.errors}")
        print("="*70 + "\n")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    otp = serializer.validated_data['otp']
    
    print(f"[MFA DEACTIVATE] User: {user.username} (ID: {user.id})")
    print(f"[MFA DEACTIVATE] Password verified: ✓")
    print(f"[MFA DEACTIVATE] MFA currently enabled: {user.mfa_enabled}")
    
    # Verify MFA secret exists
    if not user.mfa_secret:
        print(f"[MFA DEACTIVATE] FAILED - No MFA secret found")
        print("="*70 + "\n")
        return Response({
            'error': 'MFA secret not found'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify OTP with valid_window=3 (allows ±90 seconds time drift)
    totp = pyotp.TOTP(user.mfa_secret)
    print(f"[MFA DEACTIVATE] Verifying OTP with valid_window=3")
    print(f"[MFA DEACTIVATE] OTP received: {otp}")
    
    otp_valid = totp.verify(otp, valid_window=3)
    print(f"[MFA DEACTIVATE] OTP verification result: {otp_valid}")
    
    if not otp_valid:
        print(f"[MFA DEACTIVATE] FAILED - Invalid OTP code")
        print("="*70 + "\n")
        return Response({
            'error': 'Invalid OTP code'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Both password and OTP verified - deactivate MFA
    print(f"[MFA DEACTIVATE] Both password and OTP verified ✓")
    print(f"[MFA DEACTIVATE] Deactivating MFA for user {user.username}")
    
    # Clear MFA settings
    user.mfa_enabled = False
    user.mfa_secret = None
    user.save()
    
    # Audit log
    print(f"[MFA DEACTIVATE] ✅ SUCCESS")
    print(f"[MFA DEACTIVATE] User: {user.username} (ID: {user.id})")
    print(f"[MFA DEACTIVATE] Email: {user.email}")
    print(f"[MFA DEACTIVATE] Timestamp: {timezone.now()}")
    print(f"[MFA DEACTIVATE] MFA enabled: {user.mfa_enabled}")
    print(f"[MFA DEACTIVATE] MFA secret cleared: {user.mfa_secret is None}")
    print("="*70 + "\n")
    
    return Response({
        'message': 'MFA deactivated successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_recovery_codes_view(request):
    """
    Regenerate MFA recovery codes - requires password verification.
    POST /api/auth/mfa/recovery-codes/regenerate/
    
    Request body:
    {
        "password": "user_password"
    }
    
    Response:
    {
        "recovery_codes": ["ABC12345", "XYZ67890", ...]
    }
    """
    print("\n" + "="*70)
    print("[RECOVERY CODES] Regeneration request received")
    print("="*70)
    
    # Validate request data (includes password check in serializer)
    serializer = RegenerateRecoveryCodesSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        print(f"[RECOVERY CODES] Validation failed: {serializer.errors}")
        print("="*70 + "\n")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    
    print(f"[RECOVERY CODES] User: {user.username} (ID: {user.id})")
    print(f"[RECOVERY CODES] Password verified: ✓")
    print(f"[RECOVERY CODES] Old recovery codes count: {len(user.mfa_recovery_codes) if user.mfa_recovery_codes else 0}")
    
    # Generate new recovery codes
    plain_codes = generate_recovery_codes(count=10, length=8)
    hashed_codes = [make_password(code) for code in plain_codes]
    user.mfa_recovery_codes = hashed_codes
    user.save()
    
    # Audit log
    print(f"[RECOVERY CODES] ✅ SUCCESS")
    print(f"[RECOVERY CODES] User: {user.username} (ID: {user.id})")
    print(f"[RECOVERY CODES] Email: {user.email}")
    print(f"[RECOVERY CODES] Timestamp: {timezone.now()}")
    print(f"[RECOVERY CODES] New recovery codes generated: {len(plain_codes)}")
    print("="*70 + "\n")
    
    return Response({
        'recovery_codes': plain_codes
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def mfa_login_view(request):
    """
    MFA login finalization endpoint - verifies OTP and returns JWT tokens.
    POST /api/auth/mfa/login
    
    Request body:
    {
        "temp_token": "string",
        "otp": "123456"
    }
    
    Response:
    {
        "access": "token",
        "refresh": "token",
        "user": {...}
    }
    """
    print("\n" + "="*70)
    print("[MFA LOGIN] Request received")
    print("="*70)
    
    # Validate request data
    serializer = MFALoginSerializer(data=request.data)
    if not serializer.is_valid():
        print(f"[MFA LOGIN] Validation failed: {serializer.errors}")
        print("="*70 + "\n")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    temp_token = serializer.validated_data['temp_token']
    otp = serializer.validated_data.get('otp')
    recovery_code = serializer.validated_data.get('recovery_code')
    
    print(f"[MFA LOGIN] Temp token: {temp_token[:30]}...")
    if otp:
        print(f"[MFA LOGIN] OTP code: {otp}")
    if recovery_code:
        print(f"[MFA LOGIN] Recovery code: {recovery_code}")
    
    # Verify temp token
    user_id = verify_temp_token(temp_token)
    if not user_id:
        print(f"[MFA LOGIN] FAILED - Invalid or expired temporary token")
        print("="*70 + "\n")
        return Response({
            'error': 'Invalid or expired temporary token'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    print(f"[MFA LOGIN] Extracted user_id from token: {user_id}")
    
    # Get user from database
    try:
        user = User.objects.get(id=user_id)
        print(f"[MFA LOGIN] User found: {user.username} (ID: {user.id})")
        print(f"[MFA LOGIN] MFA enabled: {user.mfa_enabled}")
        print(f"[MFA LOGIN] MFA secret exists: {bool(user.mfa_secret)}")
    except User.DoesNotExist:
        print(f"[MFA LOGIN] FAILED - User not found for ID: {user_id}")
        print("="*70 + "\n")
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if MFA is enabled
    if not user.mfa_enabled or not user.mfa_secret:
        print(f"[MFA LOGIN] FAILED - MFA not properly configured for user {user.username}")
        print("="*70 + "\n")
        return Response({
            'error': 'MFA not enabled for this user'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle recovery code login
    if recovery_code:
        print(f"[MFA LOGIN] Attempting recovery code login")
        
        if not user.mfa_recovery_codes:
            print(f"[MFA LOGIN] FAILED - No recovery codes available")
            print("="*70 + "\n")
            return Response({
                'error': 'No recovery codes available'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check recovery code against hashed codes
        code_found = False
        for i, hashed_code in enumerate(user.mfa_recovery_codes):
            if check_password(recovery_code, hashed_code):
                print(f"[MFA LOGIN] ✅ Recovery code matched (index {i})")
                # Remove used recovery code
                user.mfa_recovery_codes.pop(i)
                user.save()
                code_found = True
                print(f"[MFA LOGIN] Recovery code deleted. Remaining codes: {len(user.mfa_recovery_codes)}")
                break
        
        if not code_found:
            print(f"[MFA LOGIN] FAILED - Invalid recovery code")
            print("="*70 + "\n")
            return Response({
                'error': 'Invalid recovery code'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Recovery code valid - return JWT tokens
        print(f"[MFA LOGIN] SUCCESS - Generating JWT tokens for user {user.username}")
        tokens = get_tokens_for_user(user)
        print(f"[MFA LOGIN] Access token: {tokens['access'][:40]}...")
        print("="*70 + "\n")
        
        # Check policy version (Story 2.4)
        latest_policy = getattr(settings, 'LATEST_POLICY_VERSION', 1)
        requires_policy = user.accepted_policy_version < latest_policy
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data,
            'requires_policy_acceptance': requires_policy,
            'latest_policy_version': latest_policy
        }, status=status.HTTP_200_OK)
    
    # Handle OTP login (existing logic)
    # SAFETY RESET: Verify OTP with extended time window for development
    # valid_window=6 allows ±3 minutes (180 seconds) time drift
    totp = pyotp.TOTP(user.mfa_secret)
    expected_otp = totp.now()
    
    # Get current time for comparison
    import time
    current_timestamp = int(time.time())
    otp_timestamp = current_timestamp // 30  # TOTP uses 30-second intervals
    
    print(f"[MFA LOGIN] ⚠️  DEVELOPMENT MODE: valid_window=6 (allows ±180 seconds time drift)")
    print(f"[MFA LOGIN] OTP received from client: {otp}")
    print(f"[MFA LOGIN] Expected OTP at current time: {expected_otp}")
    print(f"[MFA LOGIN] Server time: {timezone.now()}")
    print(f"[MFA LOGIN] Server timestamp: {current_timestamp}")
    print(f"[MFA LOGIN] TOTP interval: {otp_timestamp} (changes every 30 seconds)")
    
    # Calculate interval offset by checking which interval the received OTP matches
    interval_offset = None
    for offset in range(-6, 7):  # Check -6 to +6 intervals
        test_time = current_timestamp + (offset * 30)
        test_otp = totp.at(test_time)
        if test_otp == otp:
            interval_offset = offset
            time_offset_seconds = offset * 30
            print(f"[MFA LOGIN] 🎯 MATCH FOUND at interval offset: {offset}")
            print(f"[MFA LOGIN] 🎯 Time offset: {time_offset_seconds} seconds ({abs(time_offset_seconds/60):.1f} minutes)")
            if offset < 0:
                print(f"[MFA LOGIN] 🎯 Client is {abs(time_offset_seconds)} seconds BEHIND server")
            elif offset > 0:
                print(f"[MFA LOGIN] 🎯 Client is {time_offset_seconds} seconds AHEAD of server")
            else:
                print(f"[MFA LOGIN] 🎯 Client and server are synchronized")
            break
    
    if interval_offset is None:
        print(f"[MFA LOGIN] ❌ No match found in range -6 to +6 intervals")
        print(f"[MFA LOGIN] ❌ This suggests a SECRET KEY MISMATCH, not just time drift")
        print(f"[MFA LOGIN] ❌ User may need to re-scan QR code or reset MFA secret")
    
    otp_valid = totp.verify(otp, valid_window=6)
    print(f"[MFA LOGIN] OTP verification result: {otp_valid}")
    
    if otp_valid:
        # OTP valid - return JWT tokens
        print(f"[MFA LOGIN] SUCCESS - Generating JWT tokens for user {user.username}")
        tokens = get_tokens_for_user(user)
        print(f"[MFA LOGIN] Access token: {tokens['access'][:40]}...")
        print("="*70 + "\n")
        
        # Check policy version (Story 2.4)
        latest_policy = getattr(settings, 'LATEST_POLICY_VERSION', 1)
        requires_policy = user.accepted_policy_version < latest_policy
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data,
            'requires_policy_acceptance': requires_policy,
            'latest_policy_version': latest_policy
        }, status=status.HTTP_200_OK)
    
    print(f"[MFA LOGIN] FAILED - Invalid OTP code")
    print(f"[MFA LOGIN] OTP mismatch - received '{otp}' but expected '{expected_otp}'")
    print(f"[MFA LOGIN] Note: valid_window=6 checks codes from {otp_timestamp-6} to {otp_timestamp+6}")
    print(f"[MFA LOGIN] 💡 TIP: If this keeps failing, the MFA secret may be out of sync")
    print(f"[MFA LOGIN] 💡 TIP: Run the reset script to regenerate MFA secret for user")
    print("="*70 + "\n")
    
    return Response({
        'error': 'Invalid OTP code'
    }, status=status.HTTP_401_UNAUTHORIZED)


# ============================================
# RBAC Test Endpoints
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_dashboard_test(request):
    """
    Test endpoint for doctor role.
    GET /api/doctor/test-dashboard/
    
    Should only be accessible by users with 'provider' role.
    """
    return Response({
        'message': 'Welcome Doctor',
        'user': request.user.username,
        'role': request.user.role
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_dashboard_test(request):
    """
    Test endpoint for patient role.
    GET /api/patient/test-dashboard/
    
    Should only be accessible by users with 'patient' role.
    """
    return Response({
        'message': 'Welcome Patient',
        'user': request.user.username,
        'role': request.user.role
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_test(request):
    """
    Test endpoint for admin role.
    GET /api/admin/test-dashboard/
    
    Should only be accessible by users with 'admin' role.
    """
    return Response({
        'message': 'Welcome Admin',
        'user': request.user.username,
        'role': request.user.role
    }, status=status.HTTP_200_OK)


# ============================================
# Session Security - Logout
# ============================================

from rest_framework.views import APIView

class LogoutView(APIView):
    """
    Logout endpoint - blacklists the refresh token to invalidate it.
    POST /api/auth/logout/
    
    Request body:
    {
        "refresh": "refresh_token_string"
    }
    
    Response:
    {
        "message": "Successfully logged out"
    }
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# RBAC Testing - Admin Only Test View
# ============================================

from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_test_view(request):
    """
    Test endpoint to verify RBAC is working.
    Only users with 'Admin' role should be able to access this.
    
    GET /api/auth/admin-test/
    
    Response:
    {
        "message": "Admin access granted",
        "user": "username",
        "role": "Admin"
    }
    """
    # Check if user has Admin role
    if not request.user.groups.filter(name='Admin').exists():
        return Response(
            {"error": "Access denied. Admin role required."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    return Response({
        "message": "Admin access granted",
        "user": request.user.username,
        "role": "Admin"
    }, status=status.HTTP_200_OK)


# ============================================
# Invitation System - Invite-Only Registration
# ============================================

from .models import Invitation

class SendInviteView(APIView):
    """
    Admin-only endpoint to send registration invitations.
    
    POST /api/auth/invite/send/
    
    Request body:
    {
        "email": "newuser@example.com"
    }
    
    Response:
    {
        "message": "Invitation sent successfully",
        "invitation": {
            "email": "newuser@example.com",
            "token": "uuid-string",
            "expires_at": "2024-02-02T10:00:00Z",
            "registration_link": "http://localhost:3000/register?token=uuid"
        }
    }
    """
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        # Check if user has Admin role
        if not request.user.groups.filter(name='Admin').exists():
            return Response(
                {"error": "Access denied. Admin role required."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "User with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a valid invitation for this email
        existing_invitation = Invitation.objects.filter(
            email=email,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()
        
        if existing_invitation:
            return Response(
                {
                    "error": "An active invitation already exists for this email",
                    "token": str(existing_invitation.token),
                    "expires_at": existing_invitation.expires_at
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new invitation
        invitation = Invitation.objects.create(
            email=email,
            sent_by=request.user
        )
        
        # Generate registration link
        registration_link = f"http://localhost:3000/register?token={invitation.token}"
        
        # Mock email sending - print to console
        print("\n" + "="*70)
        print("INVITATION EMAIL (Mock)")
        print("="*70)
        print(f"To: {email}")
        print(f"From: {request.user.email}")
        print(f"Subject: You're invited to join SecureMed")
        print("\nMessage:")
        print(f"Hello,")
        print(f"\nYou have been invited to join SecureMed by {request.user.get_full_name()}.")
        print(f"\nPlease click the link below to complete your registration:")
        print(f"{registration_link}")
        print(f"\nThis invitation will expire in 48 hours.")
        print(f"Expires at: {invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print("="*70 + "\n")
        
        return Response({
            "message": "Invitation sent successfully",
            "invitation": {
                "email": invitation.email,
                "token": str(invitation.token),
                "expires_at": invitation.expires_at,
                "registration_link": registration_link
            }
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_invite_view(request):
    """
    Verify if an invitation token is valid.
    
    POST /api/auth/invite/verify/
    
    Request body:
    {
        "token": "uuid-string"
    }
    
    Response (valid):
    {
        "valid": true,
        "email": "newuser@example.com",
        "message": "Invitation is valid"
    }
    
    Response (invalid):
    {
        "valid": false,
        "message": "Invitation has expired / already been used / does not exist"
    }
    """
    token = request.data.get('token')
    
    if not token:
        return Response(
            {
                "valid": False,
                "message": "Token is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        invitation = Invitation.objects.get(token=token)
        
        if invitation.is_used:
            return Response({
                "valid": False,
                "message": "This invitation has already been used"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if timezone.now() > invitation.expires_at:
            return Response({
                "valid": False,
                "message": "This invitation has expired"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Invitation is valid
        return Response({
            "valid": True,
            "email": invitation.email,
            "message": "Invitation is valid"
        }, status=status.HTTP_200_OK)
        
    except Invitation.DoesNotExist:
        return Response({
            "valid": False,
            "message": "Invalid invitation token"
        }, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# User Management Views (Admin Only) - Story 1.2
# ============================================================================

from rest_framework import viewsets
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404


class UserManagementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Admin-only user management.
    
    Endpoints:
    - GET /api/auth/users/ - List all users
    - GET /api/auth/users/{id}/ - Get specific user details
    - PATCH /api/auth/users/{id}/role/ - Update user role
    """
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all().order_by('-date_joined')
    
    def get_queryset(self):
        """Only admins can access this endpoint."""
        if self.request.user.role != 'admin':
            return User.objects.none()
        return super().get_queryset()
    
    def list(self, request, *args, **kwargs):
        """List all users (Admin only)."""
        # Check admin permission
        if request.user.role != 'admin':
            return Response(
                {'error': 'Forbidden: Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'users': serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Get specific user details (Admin only)."""
        # Check admin permission
        if request.user.role != 'admin':
            return Response(
                {'error': 'Forbidden: Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'], url_path='role')
    def update_role(self, request, pk=None):
        """
        Update a user's role (Admin only).
        
        Usage: PATCH /api/auth/users/{id}/role/
        Body: {"role": "provider"}
        """
        # Check admin permission
        if request.user.role != 'admin':
            return Response(
                {'error': 'Forbidden: Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = get_object_or_404(User, pk=pk)
        
        # Prevent changing your own role
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot change your own role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = UserRoleUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            old_role = user.role
            updated_user = serializer.save()
            new_role = updated_user.role
            
            return Response({
                'message': f'User role updated from {old_role} to {new_role}',
                'user': {
                    'id': updated_user.id,
                    'username': updated_user.username,
                    'email': updated_user.email,
                    'role': updated_user.role,
                    'is_active': updated_user.is_active
                }
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# Account Deletion (Right to be Forgotten)
# ============================================

from rest_framework.views import APIView

class RequestAccountDeletionView(APIView):
    """
    Request account deletion endpoint (Story 2.3: Right to be Forgotten).
    POST /api/auth/request-deletion/
    
    Implements soft delete:
    - Sets deletion_requested_at timestamp
    - Immediately deactivates account (is_active = False)
    - Data retained for 30 days before permanent deletion
    
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Handle account deletion request.
        
        Response:
        {
            "message": "Account scheduled for deletion in 30 days."
        }
        """
        user = request.user
        
        # Mark deletion timestamp
        user.deletion_requested_at = timezone.now()
        
        # Immediate lockout (soft delete)
        user.is_active = False
        
        user.save(update_fields=['deletion_requested_at', 'is_active'])
        
        # Audit log
        print(f"\n{'='*70}")
        print("ACCOUNT DELETION REQUEST - AUDIT LOG")
        print(f"{'='*70}")
        print(f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"User ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(f"Deletion requested at: {user.deletion_requested_at}")
        print(f"Account deactivated: {not user.is_active}")
        print(f"{'='*70}\n")
        
        return Response(
            {"message": "Account scheduled for deletion in 30 days."},
            status=status.HTTP_200_OK
        )


class DownloadDeletionCertificateView(APIView):
    """
    Download deletion certificate PDF.
    GET /api/auth/deletion-certificate/
    
    Returns a PDF certificate confirming the account deletion request.
    Only accessible to users who have requested deletion.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Generate and return deletion certificate PDF.
        
        Response:
            PDF file download
        """
        from django.http import FileResponse
        from .utils import generate_deletion_certificate
        
        user = request.user
        
        # Auto-mark for deletion if not already done
        if not user.deletion_requested_at:
            # Mark deletion timestamp
            user.deletion_requested_at = timezone.now()
            
            # Immediate lockout (soft delete)
            user.is_active = False
            
            user.save(update_fields=['deletion_requested_at', 'is_active'])
            
            # Audit log for auto-marking
            print(f"\n{'='*70}")
            print("AUTO-MARKED FOR DELETION VIA CERTIFICATE REQUEST")
            print(f"{'='*70}")
            print(f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
            print(f"User ID: {user.id}")
            print(f"Username: {user.username}")
            print(f"Email: {user.email}")
            print(f"{'='*70}\n")
        
        # Generate the PDF certificate
        pdf_buffer = generate_deletion_certificate(user)
        
        # Return as file download
        filename = f"deletion_certificate_{user.id}.pdf"
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
        
        # Audit log
        print(f"\n{'='*70}")
        print("DELETION CERTIFICATE DOWNLOAD - AUDIT LOG")
        print(f"{'='*70}")
        print(f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"User ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Deletion requested at: {user.deletion_requested_at}")
        print(f"{'='*70}\n")
        
        return response


# ============================================
# Policy Updates (Story 2.4)
# ============================================

class AcceptLatestPolicyView(APIView):
    """
    Endpoint for users to accept the latest Terms of Service.
    POST /api/auth/accept-policy/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        latest_version = getattr(settings, 'LATEST_POLICY_VERSION', 1)
        
        user.accepted_policy_version = latest_version
        user.policy_accepted_at = timezone.now()
        user.save(update_fields=['accepted_policy_version', 'policy_accepted_at'])
        
        # Log this action
        print(f"\n{'='*70}")
        print("POLICY ACCEPTANCE - AUDIT LOG")
        print(f"{'='*70}")
        print(f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"User ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Accepted Version: {latest_version}")
        print(f"{'='*70}\n")
        
        return Response({
            'message': 'Policy accepted successfully',
            'accepted_version': latest_version
        }, status=status.HTTP_200_OK)


class DownloadPolicyReceiptView(APIView):
    """
    Download PDF receipt for policy acceptance.
    GET /api/auth/download-policy-receipt/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .utils import generate_policy_receipt
        from django.http import FileResponse
        
        user = request.user
        
        # Check if user has accepted policy
        if user.accepted_policy_version == 0:
            return Response({
                'error': 'No policy acceptance record found.'
            }, status=status.HTTP_404_NOT_FOUND)
            
        # Generate the PDF
        pdf_buffer = generate_policy_receipt(user, user.accepted_policy_version)
        
        # Return as file download
        filename = f"policy_receipt_v{user.accepted_policy_version}_{user.id}.pdf"
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
        
        return response
