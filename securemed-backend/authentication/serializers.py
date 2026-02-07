import re
import requests
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates password strength (min 12 chars, 1 special char).
    Requires valid invitation token and CAPTCHA verification.
    """
    password = serializers.CharField(
        write_only=True,
        min_length=12,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    token = serializers.UUIDField(
        write_only=True,
        required=True,
        help_text='Invitation token'
    )
    captcha_token = serializers.CharField(
        write_only=True,
        required=True,
        help_text='Google reCAPTCHA v2 response token'
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'role', 'token', 'captcha_token']
        extra_kwargs = {
            'email': {'required': True},
            'role': {'required': False}
        }
    
    def validate_password(self, value):
        """
        Validate password strength:
        - Minimum 12 characters
        - At least 1 special character
        """
        if len(value) < 12:
            raise serializers.ValidationError(
                "Password must be at least 12 characters long."
            )
        
        # Check for at least one special character
        special_char_pattern = r'[!@#$%^&*(),.?":{}|<>]'
        if not re.search(special_char_pattern, value):
            raise serializers.ValidationError(
                "Password must contain at least one special character."
            )
        
        return value
    
    def validate_captcha_token(self, value):
        """
        Validate Google reCAPTCHA v2 token with server-side verification.
        
        This performs a POST request to Google's reCAPTCHA API to verify
        that the token is valid and the user passed the CAPTCHA challenge.
        """
        if not value:
            raise serializers.ValidationError(
                "CAPTCHA verification is required."
            )
        
        # Google reCAPTCHA verification endpoint
        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
        
        # Prepare payload
        payload = {
            'secret': settings.RECAPTCHA_SECRET_KEY,
            'response': value
        }
        
        try:
            # Make POST request to Google's API
            response = requests.post(verify_url, data=payload, timeout=10)
            result = response.json()
            
            # Check if verification was successful
            if not result.get('success'):
                error_codes = result.get('error-codes', [])
                
                # Provide user-friendly error messages
                if 'missing-input-response' in error_codes:
                    raise serializers.ValidationError(
                        "CAPTCHA response is missing."
                    )
                elif 'invalid-input-response' in error_codes:
                    raise serializers.ValidationError(
                        "CAPTCHA response is invalid or has expired. Please try again."
                    )
                elif 'timeout-or-duplicate' in error_codes:
                    raise serializers.ValidationError(
                        "CAPTCHA has expired. Please complete it again."
                    )
                else:
                    raise serializers.ValidationError(
                        f"CAPTCHA verification failed: {', '.join(error_codes)}"
                    )
            
            # Verification successful
            return value
            
        except requests.exceptions.Timeout:
            raise serializers.ValidationError(
                "CAPTCHA verification timed out. Please try again."
            )
        except requests.exceptions.RequestException as e:
            raise serializers.ValidationError(
                f"CAPTCHA verification error: Unable to connect to verification service."
            )
    
    def validate(self, data):
        """
        Validate that passwords match.
        """
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })
        return data
    
    def create(self, validated_data):
        """
        Create user with hashed password.
        Note: token and captcha_token are removed before user creation.
        """
        validated_data.pop('password_confirm')
        validated_data.pop('token')  # Token handled in view
        validated_data.pop('captcha_token')  # CAPTCHA already validated
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'patient')
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )


class MFASetupSerializer(serializers.Serializer):
    """
    Serializer for MFA setup response.
    """
    secret = serializers.CharField(read_only=True)
    provisioning_uri = serializers.CharField(read_only=True)


class MFAVerifySerializer(serializers.Serializer):
    """
    Serializer for MFA verification (during setup).
    """
    otp = serializers.CharField(
        max_length=6,
        min_length=6,
        help_text='6-digit TOTP code'
    )


class MFALoginSerializer(serializers.Serializer):
    """
    Serializer for MFA-protected login finalization.
    Accepts either OTP or recovery code.
    """
    temp_token = serializers.CharField(help_text='Temporary token from login')
    otp = serializers.CharField(
        max_length=6,
        min_length=6,
        required=False,
        allow_blank=True,
        help_text='6-digit TOTP code'
    )
    recovery_code = serializers.CharField(
        max_length=8,
        min_length=8,
        required=False,
        allow_blank=True,
        help_text='8-character recovery code'
    )
    
    def validate(self, data):
        """
        Ensure either otp or recovery_code is provided, but not both.
        """
        otp = data.get('otp')
        recovery_code = data.get('recovery_code')
        
        if not otp and not recovery_code:
            raise serializers.ValidationError(
                'Either otp or recovery_code must be provided'
            )
        
        if otp and recovery_code:
            raise serializers.ValidationError(
                'Provide either otp or recovery_code, not both'
            )
        
        return data


class MFADeactivateSerializer(serializers.Serializer):
    """
    Serializer for MFA deactivation.
    Requires password and current OTP for security.
    """
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text='User password for verification'
    )
    otp = serializers.CharField(
        max_length=6,
        min_length=6,
        write_only=True,
        help_text='Current 6-digit TOTP code'
    )

    def validate(self, data):
        """
        Validate password against the authenticated user.
        """
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('Authentication required')
        
        user = request.user
        password = data.get('password')
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError({
                'password': 'Invalid password'
            })
        
        # Verify MFA is enabled
        if not user.mfa_enabled:
            raise serializers.ValidationError({
                'non_field_errors': 'MFA is not enabled for this account'
            })
        
        return data


class RegenerateRecoveryCodesSerializer(serializers.Serializer):
    """
    Serializer for regenerating MFA recovery codes.
    Requires password verification.
    """
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text='User password for verification'
    )
    
    def validate(self, data):
        """
        Validate password against the authenticated user.
        """
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('Authentication required')
        
        user = request.user
        password = data.get('password')
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError({
                'password': 'Invalid password'
            })
        
        # Verify MFA is enabled
        if not user.mfa_enabled:
            raise serializers.ValidationError({
                'non_field_errors': 'MFA is not enabled for this account'
            })
        
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user details.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'mfa_enabled']
        read_only_fields = ['id', 'mfa_enabled']


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (Admin only)."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'date_joined']


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user role (Admin only)."""
    
    role = serializers.ChoiceField(
        choices=['patient', 'provider', 'admin'],
        required=True,
        help_text="New role for the user"
    )
    
    class Meta:
        model = User
        fields = ['role']
    
    def validate_role(self, value):
        """Ensure role is one of the allowed values."""
        allowed_roles = ['patient', 'provider', 'admin']
        if value not in allowed_roles:
            raise serializers.ValidationError(
                f"Invalid role. Must be one of: {', '.join(allowed_roles)}"
            )
        return value
    
    def update(self, instance, validated_data):
        """
        Update user role and sync with Django Groups.
        
        This ensures that when a role changes:
        1. The user is removed from their old role group
        2. The user is added to their new role group
        """
        from django.contrib.auth.models import Group
        
        old_role = instance.role
        new_role = validated_data.get('role')
        
        # Update the role field
        instance.role = new_role
        instance.save()
        
        # Sync Django Groups
        if old_role != new_role:
            # Role mapping to Group names
            role_to_group = {
                'patient': 'Patient',
                'provider': 'Doctor',  # or 'Provider' depending on your seed script
                'admin': 'Admin'
            }
            
            # Remove from old group
            old_group_name = role_to_group.get(old_role)
            if old_group_name:
                old_group = Group.objects.filter(name=old_group_name).first()
                if old_group and instance.groups.filter(id=old_group.id).exists():
                    instance.groups.remove(old_group)
            
            # Add to new group
            new_group_name = role_to_group.get(new_role)
            if new_group_name:
                new_group, _ = Group.objects.get_or_create(name=new_group_name)
                if not instance.groups.filter(id=new_group.id).exists():
                    instance.groups.add(new_group)
        
        return instance
