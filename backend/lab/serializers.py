from rest_framework import serializers
from .models import Patient, Doctor, TestPanel, LabOrder, LabResult

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

class TestPanelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestPanel
        fields = ['id', 'name', 'description', 'cost']

class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = ['id', 'order', 'test_panel', 'result_data', 'file_upload', 'file_hash', 'comments', 'is_abnormal', 'verified_at']
        read_only_fields = ['verified_at', 'file_hash']

    def validate_result_data(self, value):
        # Example validation: check if values are within range (if schema known)
        # For now just passed
        return value

class LabOrderSerializer(serializers.ModelSerializer):
    panels_details = TestPanelSerializer(source='panels', many=True, read_only=True)
    result = LabResultSerializer(source='labresult', read_only=True)

    class Meta:
        model = LabOrder
        fields = ['id', 'patient', 'ordering_doctor', 'panels', 'panels_details', 'status', 'priority', 'clinical_notes', 'sample_id', 'created_at', 'result']
        read_only_fields = ['sample_id', 'status', 'created_at', 'result']

class BlindedWorklistSerializer(serializers.ModelSerializer):
    panels_details = TestPanelSerializer(source='panels', many=True, read_only=True)

    class Meta:
        model = LabOrder
        # Only show non-PII fields plus priority for urgency
        fields = ['id', 'sample_id', 'panels_details', 'status', 'priority', 'created_at']


