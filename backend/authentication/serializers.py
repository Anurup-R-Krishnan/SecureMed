import re
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates password strength (min 12 chars, 1 special char).
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
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'role']
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
        """
        validated_data.pop('password_confirm')
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
    """
    temp_token = serializers.CharField(help_text='Temporary token from login')
    otp = serializers.CharField(
        max_length=6,
        min_length=6,
        help_text='6-digit TOTP code'
    )


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user details.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'mfa_enabled']
        read_only_fields = ['id', 'mfa_enabled']
