from rest_framework import serializers
from .models import LabTest, LabOrder, LabResult, LabResultNotification

class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = ['id', 'name', 'code', 'category', 'description', 'turnaround_time']

class LabResultInputSerializer(serializers.Serializer):
    """Validation for lab result entry"""
    test_code = serializers.CharField(max_length=50, required=True)
    result_value = serializers.CharField(max_length=200, required=True)
    units = serializers.CharField(max_length=50, required=False, allow_blank=True)
    reference_range = serializers.CharField(max_length=100, required=False, allow_blank=True)
    flag = serializers.ChoiceField(
        choices=['normal', 'high', 'low', 'critical', 'positive', 'negative', 'inconclusive'],
        required=False,
        allow_blank=True
    )
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    
    def validate_test_code(self, value):
        """Validate test code is valid"""
        value = str(value).strip()
        if len(value) < 2 or len(value) > 50:
            raise serializers.ValidationError("Invalid test code length")
        # Only alphanumeric and hyphens
        if not all(c.isalnum() or c == '-' for c in value):
            raise serializers.ValidationError("Test code contains invalid characters")
        return value
    
    def validate_result_value(self, value):
        """Validate result value format"""
        value = str(value).strip()
        if len(value) < 1:
            raise serializers.ValidationError("Result value cannot be empty")
        if len(value) > 200:
            raise serializers.ValidationError("Result value too long")
        return value
    
    def validate_units(self, value):
        """Validate units"""
        if value:
            value = str(value).strip()
            if len(value) > 50:
                raise serializers.ValidationError("Units text too long")
        return value
    
    def validate_reference_range(self, value):
        """Validate reference range format"""
        if value:
            value = str(value).strip()
            if len(value) > 100:
                raise serializers.ValidationError("Reference range too long")
        return value
    
    def validate_notes(self, value):
        """Validate notes field"""
        if value:
            value = str(value).strip()
            if len(value) < 1:
                raise serializers.ValidationError("Notes cannot be empty if provided")
            if len(value) > 2000:
                raise serializers.ValidationError("Notes too long (max 2000 chars)")
        return value

class LabResultSerializer(serializers.ModelSerializer):
    is_abnormal = serializers.SerializerMethodField()
    test_name = serializers.CharField(source='test.name', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    sample_id = serializers.CharField(source='order.sample_id', read_only=True)

    class Meta:
        model = LabResult
        fields = '__all__'

    def validate_file_attachment(self, value):
        if value:
            if value.size > 10 * 1024 * 1024:  # 10MB limit
                raise serializers.ValidationError("File size too large. Max 10MB.")
            if not value.name.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png', '.dcm', '.docx', '.xlsx')):
                raise serializers.ValidationError("Unsupported file type. Allowed: PDF, JPG, PNG, DCM, DOCX, XLSX.")
        return value

    def get_is_abnormal(self, obj):
        return obj.flag in ['High', 'Low', 'Critical']

class LabOrderSerializer(serializers.ModelSerializer):
    # Nested serializers for read operations
    patient_details = serializers.SerializerMethodField()
    doctor_details = serializers.SerializerMethodField()
    items_details = LabTestSerializer(many=True, source='items', read_only=True)
    results = LabResultSerializer(many=True, read_only=True)
    
    # Write-only fields for creation
    items = serializers.PrimaryKeyRelatedField(many=True, queryset=LabTest.objects.all(), write_only=True)
    appointment_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = LabOrder
        fields = [
            'id', 'patient', 'doctor', 'appointment', 'appointment_id', 'items', 'items_details',
            'sample_id', 'priority', 'status', 'clinical_notes', 'fasting_required',
            'created_at', 'updated_at', 'patient_details', 'doctor_details',
            'results'
        ]
        read_only_fields = ['patient', 'doctor', 'sample_id', 'created_at', 'updated_at']

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


class LabResultNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResultNotification
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
