from rest_framework import serializers
from .models import MedicalRecord, Prescription
from appointments.serializers import DoctorSerializer

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ['id', 'medication_name', 'dosage', 'frequency', 'duration', 'instructions']

class MedicalRecordSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'record_id', 'record_type', 'record_type_display', 
            'record_date', 'doctor_name', 'diagnosis', 'file_url',
            'prescriptions', 'created_at'
        ]

    def get_file_url(self, obj):
        # Placeholder for actual file URL if implemented
        return "#"
