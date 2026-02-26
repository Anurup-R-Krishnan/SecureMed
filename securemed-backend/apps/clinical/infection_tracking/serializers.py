from rest_framework import serializers
from .models import (
    Room, Equipment, EquipmentUsageLog,
    InfectionReport, InfectionTrace, RoomRiskScore,
)


class RoomSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)

    class Meta:
        model = Room
        fields = [
            'id', 'room_id', 'name', 'room_type', 'room_type_display',
            'department', 'department_name', 'floor', 'building',
            'capacity', 'risk_level', 'risk_level_display',
            'requires_sterilization', 'metadata', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class EquipmentSerializer(serializers.ModelSerializer):
    current_room_name = serializers.CharField(source='current_room.name', read_only=True, default=None)
    equipment_type_display = serializers.CharField(source='get_equipment_type_display', read_only=True)

    class Meta:
        model = Equipment
        fields = [
            'id', 'equipment_id', 'name', 'equipment_type', 'equipment_type_display',
            'serial_number', 'current_room', 'current_room_name',
            'department', 'requires_sterilization', 'last_sterilized_at',
            'metadata', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class EquipmentUsageLogSerializer(serializers.ModelSerializer):
    patient_id = serializers.CharField(source='patient.patient_id', read_only=True)
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True, default=None)

    class Meta:
        model = EquipmentUsageLog
        fields = [
            'id', 'equipment', 'equipment_name', 'patient', 'patient_id',
            'room', 'room_name', 'used_by', 'started_at', 'ended_at',
            'sterilized_after', 'notes',
        ]


class InfectionReportSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    patient_display_id = serializers.CharField(source='patient.patient_id', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True, default=None)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    trace_count = serializers.SerializerMethodField()

    class Meta:
        model = InfectionReport
        fields = [
            'id', 'report_id', 'patient', 'patient_name', 'patient_display_id',
            'infection_name', 'infection_code', 'category', 'category_display',
            'diagnosed_at', 'severity', 'severity_display',
            'specimen_source', 'antibiotic_resistance',
            'notes', 'reported_by', 'reported_by_name',
            'metadata', 'trace_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['report_id', 'created_at', 'updated_at']

    def get_trace_count(self, obj):
        return (
            obj.source_traces.count() + obj.target_traces.count()
        )

    def create(self, validated_data):
        # Auto-generate report_id
        count = InfectionReport.objects.count()
        validated_data['report_id'] = f"INF-{count + 1:06d}"
        if self.context.get('request'):
            validated_data['reported_by'] = self.context['request'].user
        return super().create(validated_data)


class InfectionTraceSerializer(serializers.ModelSerializer):
    source_patient_id = serializers.CharField(source='source_report.patient.patient_id', read_only=True)
    source_patient_name = serializers.CharField(source='source_report.patient.user.get_full_name', read_only=True)
    target_patient_id = serializers.CharField(source='target_report.patient.patient_id', read_only=True)
    target_patient_name = serializers.CharField(source='target_report.patient.user.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vector_type_display = serializers.CharField(source='get_vector_type_display', read_only=True)
    investigated_by_name = serializers.CharField(
        source='investigated_by.get_full_name', read_only=True, default=None
    )

    class Meta:
        model = InfectionTrace
        fields = [
            'id', 'trace_id', 'source_report', 'target_report',
            'source_patient_id', 'source_patient_name',
            'target_patient_id', 'target_patient_name',
            'infection_name', 'transmission_path', 'path_length',
            'confidence_score', 'vector_type', 'vector_type_display',
            'detected_at', 'status', 'status_display',
            'investigated_by', 'investigated_by_name',
            'investigation_notes', 'metadata',
        ]
        read_only_fields = [
            'trace_id', 'source_report', 'target_report',
            'infection_name', 'transmission_path', 'path_length',
            'confidence_score', 'vector_type', 'detected_at',
        ]


class RoomRiskScoreSerializer(serializers.ModelSerializer):
    room_id = serializers.CharField(source='room.room_id', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)

    class Meta:
        model = RoomRiskScore
        fields = [
            'id', 'room', 'room_id', 'room_name',
            'score', 'patient_count', 'doctor_count', 'infection_count',
            'window_start', 'window_end', 'computed_at',
        ]
        read_only_fields = '__all__'
