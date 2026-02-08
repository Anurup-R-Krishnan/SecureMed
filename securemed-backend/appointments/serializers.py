from rest_framework import serializers
from .models import Doctor, Appointment, AppointmentHistory, Referral
from departments.models import Department
from django.contrib.auth import get_user_model

User = get_user_model()

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['name', 'building']

class DoctorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    hospital = serializers.SerializerMethodField()
    experience = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Doctor
        fields = [
            'id', 'name', 'specialization', 'hospital', 'department_name',
            'consultation_fee', 'experience', 'rating', 'reviews'
        ]

    def get_name(self, obj):
        return f"Dr. {obj.user.get_full_name()}"

    def get_hospital(self, obj):
        if obj.department:
            return f"{obj.department.building} - {obj.department.name}"
        return "Main Hospital"

    def get_experience(self, obj):
        return f"{obj.experience_years} years"

    rating = serializers.FloatField(default=4.8, read_only=True)
    reviews = serializers.IntegerField(default=120, read_only=True)


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_specialty = serializers.CharField(source='doctor.specialization', read_only=True)
    hospital = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    patient_id = serializers.CharField(source='patient.patient_id', read_only=True)
    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_id', 'patient', 'patient_id', 'doctor', 'doctor_name', 'doctor_specialty',
            'hospital', 'appointment_date', 'appointment_time', 'reason', 
            'status', 'status_display', 'created_at'
        ]
        read_only_fields = ['id', 'appointment_id', 'patient', 'patient_id', 'created_at']

    def get_hospital(self, obj):
        if obj.doctor and obj.doctor.department:
            return f"{obj.doctor.department.building}"
        return "Main Hospital"

    def create(self, validated_data):
        return super().create(validated_data)


class ReferralSerializer(serializers.ModelSerializer):
    """Serializer for Story 3.4: Patient Assignment"""
    patient_name = serializers.SerializerMethodField()
    patient_display_id = serializers.CharField(source='patient.patient_id', read_only=True)
    referring_doctor_name = serializers.SerializerMethodField()
    specialist_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Referral
        fields = [
            'id', 'referral_id', 'patient', 'patient_name', 'patient_display_id',
            'referring_doctor', 'referring_doctor_name', 'specialist', 'specialist_name',
            'department', 'department_name', 'status', 'status_display', 'priority', 'priority_display',
            'reason', 'clinical_notes', 'access_granted', 'access_expires_at',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'referral_id', 'referring_doctor', 'access_granted', 
                           'access_expires_at', 'created_at', 'updated_at', 'completed_at']
    
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
        return "Unknown"
    
    def get_referring_doctor_name(self, obj):
        if obj.referring_doctor and obj.referring_doctor.user:
            return f"Dr. {obj.referring_doctor.user.get_full_name()}"
        return "Unknown"
    
    def get_specialist_name(self, obj):
        if obj.specialist and obj.specialist.user:
            return f"Dr. {obj.specialist.user.get_full_name()}"
        return "Unknown"

