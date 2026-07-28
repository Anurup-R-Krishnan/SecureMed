"""
Input validation utilities for SecureMed
Centralizes validation logic and provides reusable validators
"""
import re

from django.core.exceptions import ValidationError
from rest_framework import serializers


class ValidatedField:
    """Helper for standardized field validation"""
    
    @staticmethod
    def validate_phone(value):
        """Validate phone number format"""
        if not re.match(r'^\+?1?\d{9,15}$', str(value).replace('-', '').replace(' ', '')):
            raise ValidationError("Invalid phone number format")
        return value
    
    @staticmethod
    def validate_patient_id(value):
        """Validate patient ID format"""
        value = str(value).strip()
        if not re.match(r'^(P-\d{4,}|\d+)$', value):
            raise ValidationError("Invalid patient ID format")
        return value
    
    @staticmethod
    def validate_invoice_id(value):
        """Validate invoice ID format"""
        value = str(value).strip()
        if not re.match(r'^(INV-[A-Z0-9]+|\d+)$', value):
            raise ValidationError("Invalid invoice ID format")
        return value
    
    @staticmethod
    def validate_diagnosis(value):
        """Validate diagnosis text - max length, no suspicious patterns"""
        value = str(value).strip()
        if len(value) > 1000:
            raise ValidationError("Diagnosis text too long (max 1000 chars)")
        if re.search(r'[<>"\']', value):
            raise ValidationError("Diagnosis contains invalid characters")
        return value
    
    @staticmethod
    def validate_url_safe_string(value, max_length=255):
        """Validate URL-safe string (alphanumeric, hyphens, underscores)"""
        value = str(value).strip()
        if len(value) > max_length:
            raise ValidationError(f"String too long (max {max_length} chars)")
        if not re.match(r'^[a-zA-Z0-9_-]*$', value):
            raise ValidationError("String contains invalid characters")
        return value


class DiagnosisSerializer(serializers.Serializer):
    """Validated input for diagnostic data"""
    patient_id = serializers.CharField(max_length=50)
    test_code = serializers.CharField(max_length=50)
    result_value = serializers.CharField(max_length=200)
    units = serializers.CharField(max_length=50, required=False, allow_blank=True)
    reference_range = serializers.CharField(max_length=100, required=False, allow_blank=True)
    flag = serializers.ChoiceField(
        choices=['normal', 'high', 'low', 'critical', 'warning'],
        required=False
    )
    notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True
    )
    
    def validate_patient_id(self, value):
        return ValidatedField.validate_patient_id(value)
    
    def validate_notes(self, value):
        return ValidatedField.validate_diagnosis(value)


class MedicalRecordAccessSerializer(serializers.Serializer):
    """Validated input for medical record access"""
    patient_id = serializers.CharField(max_length=50)
    access_reason = serializers.CharField(max_length=500)
    
    def validate_patient_id(self, value):
        return ValidatedField.validate_patient_id(value)
    
    def validate_access_reason(self, value):
        if len(value.strip()) < 10:
            raise ValidationError("Access reason must be at least 10 characters")
        return ValidatedField.validate_diagnosis(value)


class TelemedicineMessageSerializer(serializers.Serializer):
    """Validated input for telemedicine messages"""
    message = serializers.CharField(max_length=5000)
    message_type = serializers.ChoiceField(
        choices=['text', 'question', 'prescription', 'advice'],
        required=False,
        default='text'
    )
    
    def validate_message(self, value):
        value = value.strip()
        if len(value) < 1:
            raise ValidationError("Message cannot be empty")
        if len(value) > 5000:
            raise ValidationError("Message too long (max 5000 chars)")
        return value


class PharmacyOrderSerializer(serializers.Serializer):
    """Validated input for pharmacy orders"""
    medication_code = serializers.CharField(max_length=50)
    quantity = serializers.IntegerField(min_value=1, max_value=999)
    instructions = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_medication_code(self, value):
        return ValidatedField.validate_url_safe_string(value, max_length=50)
    
    def validate_instructions(self, value):
        return ValidatedField.validate_diagnosis(value)


class AppointmentFilterSerializer(serializers.Serializer):
    """Validated input for appointment filtering"""
    status = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    doctor_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate(self, data):
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise ValidationError("date_from must be before date_to")
        
        return data
