from rest_framework import serializers
from django.utils import timezone
from .models import Consent, ConsentHistory


class ConsentHistorySerializer(serializers.ModelSerializer):
    """Serializer for consent history entries."""
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    
    class Meta:
        model = ConsentHistory
        fields = ['id', 'action', 'timestamp', 'actor_username']
        read_only_fields = ['id', 'action', 'timestamp', 'actor_username']


class ConsentSerializer(serializers.ModelSerializer):
    """Serializer for patient consent records."""
    history = ConsentHistorySerializer(many=True, read_only=True)
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    
    class Meta:
        model = Consent
        fields = [
            'id',
            'patient_username',
            'department',
            'description',
            'is_granted',
            'expires_at',
            'created_at',
            'updated_at',
            'history'
        ]
        read_only_fields = ['id', 'patient_username', 'created_at', 'updated_at', 'history']
    
    def validate_expires_at(self, value):
        """Ensure expires_at is in the future if provided."""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        return value
