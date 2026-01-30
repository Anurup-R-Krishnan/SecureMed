from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import pyotp
import jwt
from django.conf import settings

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    MFASetupSerializer,
    MFAVerifySerializer,
    MFALoginSerializer,
    UserSerializer
)

User = get_user_model()

# Constants
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


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
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') == 'mfa_temp':
            return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    User registration endpoint.
    POST /api/auth/register
    
    Request body:
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "password_confirm": "string",
        "role": "patient|provider|admin" (optional, defaults to patient)
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
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
    return Response({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': UserSerializer(user).data
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
        user.save()
        return Response({
            'message': 'MFA enabled successfully'
        }, status=status.HTTP_200_OK)
    
    return Response({
        'error': 'Invalid OTP code'
    }, status=status.HTTP_400_BAD_REQUEST)


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
    serializer = MFALoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    temp_token = serializer.validated_data['temp_token']
    otp = serializer.validated_data['otp']
    
    # Verify temp token
    user_id = verify_temp_token(temp_token)
    if not user_id:
        return Response({
            'error': 'Invalid or expired temporary token'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not user.mfa_enabled or not user.mfa_secret:
        return Response({
            'error': 'MFA not enabled for this user'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify OTP
    totp = pyotp.TOTP(user.mfa_secret)
    if totp.verify(otp, valid_window=1):
        # OTP valid - return JWT tokens
        tokens = get_tokens_for_user(user)
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'error': 'Invalid OTP code'
    }, status=status.HTTP_401_UNAUTHORIZED)
