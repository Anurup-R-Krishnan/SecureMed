from rest_framework import serializers
from .models import Doctor, Appointment, AppointmentHistory
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
            'consultation_fee', 'experience', 'rating', 'reviews' # rating/reviews not in model, will mock or add
        ]
        # Note: rating and reviews are not in the model yet, adding as dummy fields or handling gracefully

    def get_name(self, obj):
        return f"Dr. {obj.user.get_full_name()}"

    def get_hospital(self, obj):
        if obj.department:
            return f"{obj.department.building} - {obj.department.name}"
        return "Main Hospital"

    def get_experience(self, obj):
        return f"{obj.experience_years} years"

    # Mocking rating/reviews for frontend compatibility until model update
    rating = serializers.FloatField(default=4.8, read_only=True)
    reviews = serializers.IntegerField(default=120, read_only=True)


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_specialty = serializers.CharField(source='doctor.specialization', read_only=True)
    hospital = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_id', 'doctor', 'doctor_name', 'doctor_specialty',
            'hospital', 'appointment_date', 'appointment_time', 'reason', 
            'status', 'status_display', 'created_at'
        ]
        read_only_fields = ['id', 'appointment_id', 'status', 'created_at']

    def get_hospital(self, obj):
        if obj.doctor.department:
            return f"{obj.doctor.department.building}"
        return "Main Hospital"

    def create(self, validated_data):
        # Patient is set in perform_create in ViewSet
        return super().create(validated_data)
