from rest_framework import serializers
from .models import LabTest, LabOrder, LabResult

class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = '__all__'

    def validate_file_attachment(self, value):
        if value:
            if value.size > 10 * 1024 * 1024:  # 10MB limit
                raise serializers.ValidationError("File size too large. Max 10MB.")
            if not value.name.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')):
                raise serializers.ValidationError("Unsupported file type. Allowed: PDF, JPG, PNG.")
        return value

class LabOrderSerializer(serializers.ModelSerializer):
    # Nested serializers for read operations
    patient_details = serializers.SerializerMethodField()
    doctor_details = serializers.SerializerMethodField()
    items_details = LabTestSerializer(many=True, source='items', read_only=True)
    results = LabResultSerializer(many=True, read_only=True)
    
    # Write-only fields for creation
    items = serializers.PrimaryKeyRelatedField(many=True, queryset=LabTest.objects.all(), write_only=True)

    class Meta:
        model = LabOrder
        fields = [
            'id', 'patient', 'doctor', 'items', 'items_details',
            'priority', 'status', 'clinical_notes', 'fasting_required',
            'created_at', 'updated_at', 'patient_details', 'doctor_details',
            'results'
        ]
        read_only_fields = ['patient', 'doctor', 'created_at', 'updated_at']

    def get_patient_details(self, obj):
        return {
            "id": obj.patient.id,
            "name": f"{obj.patient.first_name} {obj.patient.last_name}",
            "email": obj.patient.email
        }

    def get_doctor_details(self, obj):
        if obj.doctor:
            return {
                "id": obj.doctor.id,
                "name": f"{obj.doctor.first_name} {obj.doctor.last_name}",
                "specialty": getattr(obj.doctor, 'specialization', 'N/A')
            }
        return None
