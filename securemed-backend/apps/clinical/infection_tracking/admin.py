from django.contrib import admin

from .models import (
    Equipment,
    EquipmentUsageLog,
    InfectionReport,
    InfectionTrace,
    Room,
    RoomRiskScore,
)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['room_id', 'name', 'room_type', 'department', 'building', 'floor', 'risk_level', 'is_active']
    list_filter = ['room_type', 'risk_level', 'building', 'is_active', 'department']
    search_fields = ['room_id', 'name']
    ordering = ['building', 'floor', 'room_id']


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['equipment_id', 'name', 'equipment_type', 'current_room', 'requires_sterilization', 'is_active']
    list_filter = ['equipment_type', 'requires_sterilization', 'is_active']
    search_fields = ['equipment_id', 'name', 'serial_number']


@admin.register(EquipmentUsageLog)
class EquipmentUsageLogAdmin(admin.ModelAdmin):
    list_display = ['equipment', 'patient', 'room', 'started_at', 'ended_at', 'sterilized_after']
    list_filter = ['sterilized_after', 'started_at']
    raw_id_fields = ['equipment', 'patient', 'room', 'used_by']


@admin.register(InfectionReport)
class InfectionReportAdmin(admin.ModelAdmin):
    list_display = ['report_id', 'patient', 'infection_name', 'category', 'severity', 'diagnosed_at']
    list_filter = ['infection_name', 'category', 'severity', 'diagnosed_at']
    search_fields = ['report_id', 'infection_name', 'infection_code']
    raw_id_fields = ['patient', 'reported_by']
    date_hierarchy = 'diagnosed_at'


@admin.register(InfectionTrace)
class InfectionTraceAdmin(admin.ModelAdmin):
    list_display = ['trace_id', 'infection_name', 'vector_type', 'path_length', 'confidence_score', 'status', 'detected_at']
    list_filter = ['status', 'vector_type', 'infection_name']
    search_fields = ['trace_id', 'infection_name']
    raw_id_fields = ['source_report', 'target_report', 'investigated_by']
    date_hierarchy = 'detected_at'


@admin.register(RoomRiskScore)
class RoomRiskScoreAdmin(admin.ModelAdmin):
    list_display = ['room', 'score', 'patient_count', 'doctor_count', 'infection_count', 'computed_at']
    list_filter = ['computed_at']
    raw_id_fields = ['room']
