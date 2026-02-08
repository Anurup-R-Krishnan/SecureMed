from rest_framework import serializers
from .models import MedicalRecord, Prescription
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
