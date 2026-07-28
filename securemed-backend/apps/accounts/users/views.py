import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

try:
    from django_ratelimit.decorators import ratelimit
except ImportError:
    def ratelimit(key, rate, method=None, block=False):
        def decorator(fn):
            return fn
        return decorator
import secrets
import string

import jwt
import pyotp
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.platform.analytics.audit import get_client_ip, log_audit

from .serializers import (
    AdminUserCreateSerializer,
    MFADeactivateSerializer,
    MFALoginSerializer,
    MFAVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegenerateRecoveryCodesSerializer,
    UserListSerializer,
    UserLoginSerializer,
    UserRegistrationSerializer,
    UserRoleUpdateSerializer,
    UserSerializer,
    UserUpdateSerializer,
    _hash_reset_token,
)

User = get_user_model()
logger = logging.getLogger('security')

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
    return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm='HS256')


def verify_temp_token(token):
    """
    Verify and decode temporary MFA token.
    Returns user_id if valid, None otherwise.
    """
    try:
        # Explicitly use HS256 algorithm and settings.SECRET_KEY
        payload = jwt.decode(token, settings.JWT_SIGNING_KEY, algorithms=['HS256'])
        
        # Check if token type is correct
        if payload.get('type') != 'mfa_temp':
            logger.warning("MFA temp token rejected: invalid token type.")
            return None
        user_id = payload.get('user_id')
        if not user_id:
            logger.warning("MFA temp token rejected: missing user_id.")
            return None
        return user_id
            
    except jwt.ExpiredSignatureError:
        logger.info("MFA temp token expired.")
        return None
        
    except jwt.InvalidSignatureError:
        logger.warning("MFA temp token rejected: invalid signature.")
        return None
        
    except jwt.DecodeError:
        logger.warning("MFA temp token rejected: decode error.")
        return None
        
    except jwt.InvalidTokenError:
        logger.warning("MFA temp token rejected: invalid token.")
        return None


def get_user_data_with_profile(user):
    """
    Build user data dict enriched with role-specific profile information.
    For doctors, includes specialization, department, doctor_id, etc.
    """
    data = UserSerializer(user).data
    
    # Enrich with doctor profile data if available
    try:
        doctor = user.doctor_profile
    except ObjectDoesNotExist:
        doctor = None
    if doctor:
        data['doctor_profile'] = {
            'doctor_id': doctor.doctor_id,
            'specialization': doctor.specialization,
            'specialization_display': doctor.get_specialization_display(),
            'qualification': doctor.qualification,
            'experience_years': doctor.experience_years,
            'department_name': doctor.department.name if doctor.department else None,
            'department_code': doctor.department.code if doctor.department else None,
            'consultation_fee': str(doctor.consultation_fee),
            'rating': str(doctor.rating),
            'reviews': doctor.reviews,
            'is_available': doctor.is_available,
        }
            
    try:
        patient = user.patient_profile
    except ObjectDoesNotExist:
        patient = None
    if patient:
        data['patient_profile'] = {
            'patient_id': patient.patient_id,
            'date_of_birth': patient.date_of_birth,
            'gender': patient.gender,
            'blood_group': patient.blood_group,
            'phone': patient.phone,
            'address': patient.address,
            'city': patient.city,
            'state': patient.state,
            'postal_code': patient.postal_code,
            'insurance_provider': patient.insurance_provider,
            'insurance_number': patient.insurance_number,
            'allergies': patient.allergies,
            'chronic_conditions': patient.chronic_conditions,
        }
    
    return data


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Get or update current user profile with role-specific data.
    GET /api/auth/user/
    PUT /api/auth/user/
    
    Response (doctor):
    {
        "id": 1,
        "username": "john",
        "email": "john@example.com",
        "role": "provider",
        "mfa_enabled": true,
        "first_name": "John",
        "last_name": "Doe",
        "doctor_profile": {
            "doctor_id": "DOC-001",
            "specialization": "general",
            "specialization_display": "General Medicine",
            "qualification": "MBBS, MD",
            "experience_years": 10,
            "department_name": "General Medicine",
            ...
        }
    }
    """
    if request.method == 'GET':
        data = get_user_data_with_profile(request.user)
        return Response(data, status=status.HTTP_200_OK)

    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        data = get_user_data_with_profile(request.user)
        return Response(data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change password for current user.
    POST /api/auth/user/password/
    Body: { "current_password": "", "new_password": "", "confirm_password": "" }
    """
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not current_password or not new_password or not confirm_password:
        return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'New password and confirmation do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(current_password):
        return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from django.contrib.auth.password_validation import validate_password
        validate_password(new_password, user=user)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])

    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='3/m', block=True)
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
    
    logger.info("Registration attempt from ip %s", ip_address)
    
    # Validate invitation token before proceeding
    token = request.data.get('token')
    if not token:
        logger.warning("Registration failed: missing invitation token (ip %s)", ip_address)
        return Response({
            'error': 'Invitation token is required for registration'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .models import Invitation
        invitation = Invitation.objects.get(token=token)
        
        # Check if invitation is valid
        if invitation.is_used:
            logger.warning("Registration failed: invitation already used (ip %s)", ip_address)
            return Response({
                'error': 'This invitation has already been used'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if timezone.now() > invitation.expires_at:
            logger.warning("Registration failed: invitation expired (ip %s)", ip_address)
            return Response({
                'error': 'This invitation has expired'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify email matches invitation
        if request.data.get('email') != invitation.email:
            logger.warning("Registration failed: invitation email mismatch (ip %s)", ip_address)
            return Response({
                'error': 'Email does not match invitation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Invitation.DoesNotExist:
        logger.warning("Registration failed: invalid invitation token (ip %s)", ip_address)
        return Response({
            'error': 'Invalid invitation token'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Proceed with registration
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Mark invitation as used
        invitation.mark_as_used(user)
        
        # Auto-create Patient profile for patient role users
        if user.role == 'patient':
            import uuid

            from apps.accounts.patients.models import Patient
            
            # Generate unique patient ID
            patient_id = f"PT-{uuid.uuid4().hex[:8].upper()}"
            
            # Create patient profile with minimal required data
            # User can update their profile later
            Patient.objects.create(
                user=user,
                patient_id=patient_id,
                date_of_birth=request.data.get('date_of_birth', '1990-01-01'),  # Default, user updates later
                gender=request.data.get('gender', 'O'),  # 'O' for Other as default
                phone=request.data.get('phone', '+0000000000'),  # Placeholder
                emergency_contact=request.data.get('emergency_contact', '+0000000000'),
                address=request.data.get('address', 'Not provided'),
                city=request.data.get('city', 'Not provided'),
                state=request.data.get('state', 'Not provided'),
                postal_code=request.data.get('postal_code', '000000'),
            )
        
        # Audit: registration
        log_audit(
            actor=user,
            action='register',
            resource_type='User',
            resource_id=str(user.id),
            description=f'New user registered: {user.email} (role: {user.role})',
            ip_address=get_client_ip(request),
        )
        logger.info("Registration succeeded for user_id=%s", user.id)
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    logger.warning("Registration failed: validation errors")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='5/m', block=True)
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
        
        # Audit: failed login
        log_audit(
            actor=user,
            action='login_failed',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Failed login attempt for {user.email} (attempt {user.failed_login_attempts})',
            ip_address=get_client_ip(request),
        )
        
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
    
    # Check if MFA is enabled and feature flag is on
    if getattr(settings, 'MFA_ENABLED', False) and user.mfa_enabled:
        # Return temp token for MFA verification
        temp_token = generate_temp_token(user)
        return Response({
            'mfa_required': True,
            'temp_token': temp_token
        }, status=status.HTTP_200_OK)
    
    # No MFA - return tokens immediately
    tokens = get_tokens_for_user(user)
    
    # Audit: successful login
    log_audit(
        actor=user,
        action='login',
        resource_type='User',
        resource_id=str(user.id),
        description=f'User {user.email} logged in',
        ip_address=get_client_ip(request),
    )
    
    # Check policy version (Story 2.4)
    latest_policy = getattr(settings, 'LATEST_POLICY_VERSION', 1)
    requires_policy = user.accepted_policy_version < latest_policy
    
    return Response({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': get_user_data_with_profile(user),
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
    if not getattr(settings, 'MFA_ENABLED', False):
        return Response({'error': 'MFA is temporarily disabled'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
    if not getattr(settings, 'MFA_ENABLED', False):
        return Response({'error': 'MFA is temporarily disabled'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
        
        # Audit: MFA enabled
        log_audit(
            actor=user,
            action='mfa_enabled',
            resource_type='User',
            resource_id=str(user.id),
            description=f'MFA enabled for {user.email}',
            ip_address=get_client_ip(request),
        )
        logger.info("MFA enabled for user_id=%s", user.id)
        
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
    if not getattr(settings, 'MFA_ENABLED', False):
        return Response({'error': 'MFA is temporarily disabled'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # Validate request data (includes password check in serializer)
    serializer = MFADeactivateSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    otp = serializer.validated_data['otp']
    
    # Verify MFA secret exists
    if not user.mfa_secret:
        return Response({
            'error': 'MFA secret not found'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify OTP with valid_window=3 (allows ±90 seconds time drift)
    totp = pyotp.TOTP(user.mfa_secret)
    
    otp_valid = totp.verify(otp, valid_window=3)
    
    if not otp_valid:
        logger.warning("MFA deactivation failed: invalid OTP (user_id=%s)", user.id)
        return Response({
            'error': 'Invalid OTP code'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Both password and OTP verified - deactivate MFA
    
    # Clear MFA settings
    user.mfa_enabled = False
    user.mfa_secret = None
    user.save()
    
    # Audit: MFA disabled
    log_audit(
        actor=user,
        action='mfa_disabled',
        resource_type='User',
        resource_id=str(user.id),
        description=f'MFA disabled for {user.email}',
        ip_address=get_client_ip(request),
    )
    logger.info("MFA disabled for user_id=%s", user.id)
    
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
    if not getattr(settings, 'MFA_ENABLED', False):
        return Response({'error': 'MFA is temporarily disabled'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # Validate request data (includes password check in serializer)
    serializer = RegenerateRecoveryCodesSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    
    # Generate new recovery codes
    plain_codes = generate_recovery_codes(count=10, length=8)
    hashed_codes = [make_password(code) for code in plain_codes]
    user.mfa_recovery_codes = hashed_codes
    user.save()
    logger.info("MFA recovery codes regenerated for user_id=%s", user.id)
    
    return Response({
        'recovery_codes': plain_codes
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='5/m', block=True)
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
    if not getattr(settings, 'MFA_ENABLED', False):
        return Response({'error': 'MFA is temporarily disabled'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # Validate request data
    serializer = MFALoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    temp_token = serializer.validated_data['temp_token']
    otp = serializer.validated_data.get('otp')
    recovery_code = serializer.validated_data.get('recovery_code')
    
    # Verify temp token
    user_id = verify_temp_token(temp_token)
    if not user_id:
        return Response({
            'error': 'Invalid or expired temporary token'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get user from database
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if MFA is enabled
    if not user.mfa_enabled or not user.mfa_secret:
        return Response({
            'error': 'MFA not enabled for this user'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle recovery code login
    if recovery_code:
        if not user.mfa_recovery_codes:
            return Response({
                'error': 'No recovery codes available'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check recovery code against hashed codes
        code_found = False
        for i, hashed_code in enumerate(user.mfa_recovery_codes):
            if check_password(recovery_code, hashed_code):
                # Remove used recovery code
                user.mfa_recovery_codes.pop(i)
                user.save()
                code_found = True
                break
        
        if not code_found:
            logger.warning("MFA login failed: invalid recovery code (user_id=%s)", user.id)
            return Response({
                'error': 'Invalid recovery code'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Recovery code valid - return JWT tokens
        tokens = get_tokens_for_user(user)
        logger.info("MFA login via recovery code succeeded for user_id=%s", user.id)
        
        # Audit: MFA login via recovery code
        log_audit(
            actor=user,
            action='login',
            resource_type='User',
            resource_id=str(user.id),
            description=f'User {user.email} logged in via MFA recovery code',
            ip_address=get_client_ip(request),
            extra={'method': 'mfa_recovery_code'},
        )
        
        # Check policy version (Story 2.4)
        latest_policy = getattr(settings, 'LATEST_POLICY_VERSION', 1)
        requires_policy = user.accepted_policy_version < latest_policy
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': get_user_data_with_profile(user),
            'requires_policy_acceptance': requires_policy,
            'latest_policy_version': latest_policy
        }, status=status.HTTP_200_OK)
    
    # Handle OTP login (existing logic)
    totp = pyotp.TOTP(user.mfa_secret)
    otp_valid = totp.verify(otp, valid_window=settings.MFA_TOTP_VALID_WINDOW)
    
    if otp_valid:
        # OTP valid - return JWT tokens
        tokens = get_tokens_for_user(user)
        logger.info("MFA login via OTP succeeded for user_id=%s", user.id)
        
        # Audit: MFA login via OTP
        log_audit(
            actor=user,
            action='login',
            resource_type='User',
            resource_id=str(user.id),
            description=f'User {user.email} logged in via MFA OTP',
            ip_address=get_client_ip(request),
            extra={'method': 'mfa_otp'},
        )
        
        # Check policy version (Story 2.4)
        latest_policy = getattr(settings, 'LATEST_POLICY_VERSION', 1)
        requires_policy = user.accepted_policy_version < latest_policy
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': get_user_data_with_profile(user),
            'requires_policy_acceptance': requires_policy,
            'latest_policy_version': latest_policy
        }, status=status.HTTP_200_OK)
    
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
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Audit: logout
        log_audit(
            actor=request.user,
            action='logout',
            resource_type='User',
            resource_id=str(request.user.id),
            description=f'User {request.user.email} logged out',
            ip_address=get_client_ip(request),
        )
        
        return Response({"message": "Successfully logged out"}, status=status.HTTP_205_RESET_CONTENT)


class PasswordResetRequestView(APIView):
    """
    Request password reset email.
    POST /api/auth/password-reset/
    
    Request body:
    {
        "email": "user@example.com"
    }
    
    Response (always 200 to prevent email enumeration):
    {
        "message": "If an account exists with this email, a password reset link has been sent."
    }
    """
    permission_classes = (AllowAny,)

    @method_decorator(ratelimit(key='ip', rate='3/m', method='POST', block=True))
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email'].strip().lower()
        
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
            
            # Generate reset token (valid for 1 hour)
            reset_token = secrets.token_urlsafe(32)
            user.password_reset_token = _hash_reset_token(reset_token)
            user.password_reset_expires = timezone.now() + timedelta(hours=1)
            user.save(update_fields=['password_reset_token', 'password_reset_expires'])

            # Send password reset email (include user id for efficient lookup)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={user.id}&token={reset_token}"
            subject = "Password Reset Request - SecureMed"
            message = f"""
Dear {user.get_full_name() or user.username},

You requested a password reset for your SecureMed account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email and your password will remain unchanged.

Best regards,
SecureMed Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            
        except User.DoesNotExist:
            pass  # Don't reveal if email exists
        
        return Response({
            'message': 'If an account exists with this email, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.
    POST /api/auth/password-reset/confirm/
    
    Request body:
    {
        "token": "reset_token_here",
        "password": "new_password",
        "password_confirm": "new_password"
    }
    
    Response:
    {
        "message": "Password has been reset successfully."
    }
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        new_password = serializer.validated_data['password']
        
        # Set new password
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        user.save(update_fields=['password', 'password_reset_token', 'password_reset_expires'])
        
        # Audit: password reset
        log_audit(
            actor=user,
            action='password_reset',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Password reset completed for {user.email}',
        )
        
        return Response({
            'message': 'Password has been reset successfully.'
        }, status=status.HTTP_200_OK)


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
        # Check if user has Admin role (use role field, not groups)
        if request.user.role != 'admin' and not request.user.is_superuser:
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
        registration_link = f"{settings.FRONTEND_URL}/register?token={invitation.token}"
        subject = "You're invited to join SecureMed"
        message = (
            "Hello,\n\n"
            f"You have been invited to join SecureMed by {request.user.get_full_name() or 'an administrator'}.\n\n"
            "Please click the link below to complete your registration:\n"
            f"{registration_link}\n\n"
            "This invitation will expire in 48 hours.\n"
            f"Expires at: {invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        log_audit(
            actor=request.user,
            action='invitation_sent',
            resource_type='Invitation',
            resource_id=str(invitation.id),
            description='Registration invitation sent',
            ip_address=get_client_ip(request),
        )
        logger.info("Invitation sent for invitation_id=%s", invitation.id)
        
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
@ratelimit(key='ip', rate='10/m', block=True)
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

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action


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
            
            # Audit: role change
            log_audit(
                actor=request.user,
                action='user_role_changed',
                resource_type='User',
                resource_id=str(updated_user.id),
                description=f'Role changed from {old_role} to {new_role} for {updated_user.email}',
                ip_address=get_client_ip(request),
                extra={'old_role': old_role, 'new_role': new_role},
            )
            
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

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate_user(self, request, pk=None):
        """
        Deactivate a user account (Admin only).
        POST /api/auth/users/{id}/deactivate/
        """
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden: Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, pk=pk)
        if user.id == request.user.id:
            return Response({'error': 'Cannot deactivate your own account'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save(update_fields=['is_active'])

        log_audit(
            actor=request.user,
            action='user_deactivated',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Admin {request.user.email} deactivated user {user.email}',
            ip_address=get_client_ip(request),
        )

        return Response({'message': 'User deactivated', 'user_id': user.id, 'is_active': user.is_active})

    @action(detail=True, methods=['post'], url_path='activate')
    def activate_user(self, request, pk=None):
        """
        Reactivate a user account (Admin only).
        POST /api/auth/users/{id}/activate/
        """
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden: Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, pk=pk)
        user.is_active = True
        user.save(update_fields=['is_active'])

        log_audit(
            actor=request.user,
            action='user_activated',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Admin {request.user.email} activated user {user.email}',
            ip_address=get_client_ip(request),
        )

        return Response({'message': 'User activated', 'user_id': user.id, 'is_active': user.is_active})

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Reset a user's password and return a temporary password (Admin only).
        POST /api/auth/users/{id}/reset-password/
        """
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden: Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, pk=pk)
        if user.id == request.user.id:
            return Response({'error': 'Cannot reset your own password here'}, status=status.HTTP_400_BAD_REQUEST)

        alphabet = string.ascii_letters + string.digits + '!@#$%^&*()'
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(14))

        user.set_password(temp_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until'])

        log_audit(
            actor=request.user,
            action='user_password_reset',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Admin {request.user.email} reset password for {user.email}',
            ip_address=get_client_ip(request),
        )

        # NOTE: temporary_password is returned in the response so the admin can communicate it to the user.
        # In a high-security deployment, consider sending it via a separate channel (e.g. email) instead.
        return Response({'message': 'Password reset successful', 'temporary_password': temp_password})

    @action(detail=False, methods=['post'], url_path='create')
    def create_user(self, request):
        """
        Create a new user (Admin only).
        POST /api/auth/users/create/
        """
        if request.user.role != 'admin':
            return Response(
                {'error': 'Forbidden: Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AdminUserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Audit: user created by admin
            log_audit(
                actor=request.user,
                action='user_created',
                resource_type='User',
                resource_id=str(user.id),
                description=f'Admin {request.user.email} created user {user.email} (role: {user.role})',
                ip_address=get_client_ip(request),
            )
            
            return Response({
                'message': 'User created successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'is_active': user.is_active
                }
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def request_deletion(self, request, pk=None):
        """
        Request account deletion (Right to be Forgotten).
        POST /api/auth/users/{id}/request_deletion/
        
        Response:
        {
            "message": "Deletion request submitted. Your account will be deleted in 30 days.",
            "deletion_date": "2026-03-10T12:00:00Z"
        }
        """
        user = self.get_object()
        
        # Only allow users to delete their own account
        if user.id != request.user.id and not request.user.is_staff:
            return Response(
                {"error": "You can only request deletion of your own account."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if deletion already requested
        if user.deletion_requested_at:
            return Response(
                {
                    "error": "Deletion already requested",
                    "deletion_date": user.deletion_requested_at + timedelta(days=30)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set deletion request timestamp
        user.deletion_requested_at = timezone.now()
        user.save()
        
        deletion_date = user.deletion_requested_at + timedelta(days=30)
        
        return Response({
            "message": "Deletion request submitted. Your account will be deleted in 30 days.",
            "deletion_date": deletion_date
        }, status=status.HTTP_200_OK)


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
        log_audit(
            actor=user,
            action='account_deletion_requested',
            resource_type='User',
            resource_id=str(user.id),
            description='User requested account deletion',
            ip_address=get_client_ip(request),
        )
        
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
        auto_marked = False
        
        # Auto-mark for deletion if not already done
        if not user.deletion_requested_at:
            auto_marked = True
        
        # Prepare user object for certificate generation (in-memory only)
        if not user.deletion_requested_at:
            user.deletion_requested_at = timezone.now()
            
        # Generate the PDF certificate (User is still active here)
        pdf_buffer = generate_deletion_certificate(user)
        
        # Now apply the deletion request and deactivate persistent state
        if user.is_active:
             # Ensure we're setting the timestamp if it wasn't already set in DB
             if not user.id or not User.objects.get(id=user.id).deletion_requested_at:
                  user.deletion_requested_at = timezone.now()
              
             user.is_active = False
             user.save(update_fields=['deletion_requested_at', 'is_active'])
        if auto_marked:
            log_audit(
                actor=user,
                action='account_deletion_auto_marked',
                resource_type='User',
                resource_id=str(user.id),
                description='Account auto-marked for deletion via certificate download',
                ip_address=get_client_ip(request),
            )
        
        # Return as file download
        filename = f"deletion_certificate_{user.id}.pdf"
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
        log_audit(
            actor=user,
            action='deletion_certificate_downloaded',
            resource_type='User',
            resource_id=str(user.id),
            description='Deletion certificate downloaded',
            ip_address=get_client_ip(request),
        )
        
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
        log_audit(
            actor=user,
            action='policy_accepted',
            resource_type='Policy',
            resource_id=str(latest_version),
            description='User accepted latest policy',
            ip_address=get_client_ip(request),
            extra={'version': latest_version},
        )
        
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
        from django.http import FileResponse

        from .utils import generate_policy_receipt
        
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


# ============================================
# Doctor Search API (for Triage Handover)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_search_api(request):
    """
    Return a list of doctors, optionally filtered by ?specialty=<value>.

    GET /api/auth/doctors/search/?specialty=cardiology
    """
    specialty = request.query_params.get('specialty', '').strip()
    doctors = User.objects.filter(role='doctor').select_related('doctor_profile')
    if specialty:
        doctors = doctors.filter(doctor_profile__specialization__iexact=specialty)
    results = []
    for user in doctors:
        profile = getattr(user, 'doctor_profile', None)
        results.append({
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'specialty': profile.specialization if profile else '',
            'specialty_display': profile.get_specialization_display() if profile else '',
        })
    return Response(results, status=status.HTTP_200_OK)
