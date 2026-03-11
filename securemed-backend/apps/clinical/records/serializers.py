from rest_framework import serializers
from .models import (
    MedicalRecord,
    Prescription,
    VitalSign,
    PharmacyOrder,
    MedicationAdherenceLog,
    MedicationHistoryEvent,
    MedicationInteractionKnowledge,
    MedicationInteractionReport,
    MedicationInteractionReportItem,
)
from apps.scheduling.appointments.serializers import DoctorSerializer
from datetime import timedelta

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(write_only=True, required=False)
    doctor_name = serializers.SerializerMethodField()
    is_refill_needed = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id', 'medical_record', 'patient_id', 'medication_name', 'dosage', 'frequency', 'duration', 'instructions',
            'status', 'is_signed', 'signed_at', 'signed_by', 'signature_hash', 'override_reason',
            'doctor_name', 'is_refill_needed', 'days_remaining', 'end_date'
        ]
        read_only_fields = ['status', 'is_signed', 'signed_at', 'signed_by', 'signature_hash', 'medical_record']
    
    def get_doctor_name(self, obj):
        if obj.medical_record and obj.medical_record.doctor and obj.medical_record.doctor.user:
            return obj.medical_record.doctor.user.get_full_name()
        if obj.signed_by:
             return obj.signed_by.get_full_name()
        return "Unknown Provider"

    def _parse_duration_days(self, duration: str):
        if not duration:
            return None
        value = duration.strip().lower()
        if 'ongoing' in value or 'indefinite' in value:
            return None
        parts = value.split()
        for i, part in enumerate(parts):
            if part.isdigit():
                try:
                    days = int(part)
                    if 'week' in value:
                        return days * 7
                    if 'month' in value:
                        return days * 30
                    return days
                except ValueError:
                    return None
        return None

    def get_end_date(self, obj):
        if not obj.signed_at:
            return None
        days = self._parse_duration_days(obj.duration)
        if not days:
            return None
        return (obj.signed_at.date() + timedelta(days=days)).isoformat()

    def get_days_remaining(self, obj):
        if not obj.signed_at:
            return None
        days = self._parse_duration_days(obj.duration)
        if not days:
            return None
        from django.utils import timezone
        end_date = obj.signed_at.date() + timedelta(days=days)
        remaining = (end_date - timezone.now().date()).days
        return max(0, remaining)

    def get_is_refill_needed(self, obj):
        days_remaining = self.get_days_remaining(obj)
        if days_remaining is None:
            return False
        return days_remaining <= 5

class MedicalRecordSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    patient_display_id = serializers.SerializerMethodField()
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'record_id', 'record_type', 'record_type_display', 
            'record_date', 'doctor', 'doctor_name', 'patient', 'patient_name', 'patient_display_id',
            'diagnosis', 'symptoms', 'treatment', 'file', 'file_url',
            'prescriptions', 'created_at', 'source', 'is_attested', 'notes',
            'private_notes'
        ]
        extra_kwargs = {
            'doctor': {'write_only': True, 'required': False}
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        is_doctor = hasattr(user, 'doctor_profile') or getattr(user, 'role', None) == 'doctor' or getattr(user, 'is_staff', False)
        if not is_doctor:
            data.pop('private_notes', None)
        return data

    def get_doctor_name(self, obj):
        if obj.doctor and obj.doctor.user:
            return obj.doctor.user.get_full_name()
        if obj.source == 'patient':
            return "Patient (Self-Reported)"
        return "Unknown Provider"

    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name()
        return "Unknown Patient"

    def get_patient_display_id(self, obj):
        if obj.patient:
            return obj.patient.patient_id
        return None

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


class MedicationInteractionKnowledgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationInteractionKnowledge
        fields = [
            'id',
            'medications',
            'combination_size',
            'severity',
            'side_effect',
            'description',
            'source',
            'source_version',
            'created_at',
        ]


class MedicationInteractionReportItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationInteractionReportItem
        fields = [
            'id',
            'finding_type',
            'medications',
            'combination_size',
            'side_effect',
            'severity',
            'description',
            'source',
            'source_reference',
        ]


class MedicationInteractionReportSerializer(serializers.ModelSerializer):
    items = MedicationInteractionReportItemSerializer(many=True, read_only=True)

    class Meta:
        model = MedicationInteractionReport
        fields = [
            'id',
            'patient',
            'generated_by',
            'trigger_event',
            'medications',
            'total_medications',
            'total_pairs_checked',
            'total_triplets_checked',
            'total_findings',
            'critical_count',
            'high_count',
            'moderate_count',
            'low_count',
            'evaluated_combination_depth',
            'max_supported_combination_size',
            'not_evaluated_depths',
            'coverage_gap',
            'source_version',
            'created_at',
            'items',
        ]


class PharmacyOrderSerializer(serializers.ModelSerializer):
    qr_payload = serializers.SerializerMethodField()
    prescription_details = serializers.SerializerMethodField()
    patient_details = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyOrder
        fields = '__all__'
        read_only_fields = ['id', 'pickup_code', 'created_at']

    def get_qr_payload(self, obj):
        return f"SECUREMED:RX:{obj.pickup_code}"

    def get_prescription_details(self, obj):
        rx = obj.prescription
        return {
            "medication_name": rx.medication_name,
            "dosage": rx.dosage,
            "frequency": rx.frequency,
            "duration": rx.duration,
            "instructions": rx.instructions,
            "status": rx.status,
        }

    def get_patient_details(self, obj):
        patient = obj.prescription.medical_record.patient
        return {
            "id": patient.id,
            "patient_id": patient.patient_id,
            "name": f"{patient.user.first_name} {patient.user.last_name}"
        }


class MedicationAdherenceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationAdherenceLog
        fields = '__all__'
        read_only_fields = ['id', 'taken_at']


class MedicationHistoryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationHistoryEvent
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']
