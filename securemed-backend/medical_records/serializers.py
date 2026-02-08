from rest_framework import serializers
from .models import MedicalRecord, Prescription, VitalSign
from appointments.serializers import DoctorSerializer

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(write_only=True)
    doctor_name = serializers.CharField(source='medical_record.doctor.user.get_full_name', read_only=True)
    # medical_record = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'medical_record', 'patient_id', 'medication_name', 'dosage', 'frequency', 'duration', 'instructions',
            'status', 'is_signed', 'signed_at', 'signed_by', 'signature_hash', 'doctor_name'
        ]
        read_only_fields = ['status', 'is_signed', 'signed_at', 'signed_by', 'signature_hash', 'medical_record']

class MedicalRecordSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'record_id', 'record_type', 'record_type_display', 
            'record_date', 'doctor_name', 'diagnosis', 'file', 'file_url',
            'prescriptions', 'created_at'
        ]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

class VitalSignSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalSign
        fields = '__all__'
        read_only_fields = ('recorded_at',)
    
    def validate_heart_rate(self, value):
        """Validate heart rate is within reasonable range"""
        if value is not None and (value < 30 or value > 250):
            raise serializers.ValidationError(
                "Heart rate must be between 30 and 250 bpm"
            )
        return value
    
    def validate_systolic_bp(self, value):
        """Validate systolic blood pressure"""
        if value is not None and (value < 70 or value > 250):
            raise serializers.ValidationError(
                "Systolic BP must be between 70 and 250 mmHg"
            )
        return value
    
    def validate_diastolic_bp(self, value):
        """Validate diastolic blood pressure"""
        if value is not None and (value < 40 or value > 150):
            raise serializers.ValidationError(
                "Diastolic BP must be between 40 and 150 mmHg"
            )
        return value
    
    def validate_weight(self, value):
        """Validate weight is positive and reasonable"""
        if value is not None and (value <= 0 or value > 500):
            raise serializers.ValidationError(
                "Weight must be between 0 and 500 kg"
            )
        return value
    
    def validate_temperature(self, value):
        """Validate body temperature"""
        if value is not None and (value < 30 or value > 45):
            raise serializers.ValidationError(
                "Temperature must be between 30 and 45 °C"
            )
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        systolic = data.get('systolic_bp')
        diastolic = data.get('diastolic_bp')
        
        if systolic and diastolic and systolic <= diastolic:
            raise serializers.ValidationError({
                'systolic_bp': 'Systolic BP must be greater than diastolic BP'
            })
        
        return data

