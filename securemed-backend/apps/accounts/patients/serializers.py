from rest_framework import serializers
from .models import Patient, EmergencyContact

class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'relationship', 'phone', 'email', 'is_primary']

class PatientSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'user_id', 'user_first_name', 'user_last_name', 'user_email', 'user_is_active',
            'date_of_birth', 'gender', 'blood_group',
            'phone', 'emergency_contact', 'address', 'city', 'state', 'postal_code', 'country',
            'allergies', 'chronic_conditions', 'current_medications',
            'insurance_provider', 'insurance_number',
            'emergency_contacts'
        ]
        read_only_fields = [
            'patient_id', 'date_of_birth', 'gender', 'blood_group', 'emergency_contacts',
            'allergies', 'chronic_conditions', 'current_medications' # Clinical data must be clinician-managed
        ]
