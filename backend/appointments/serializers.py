from rest_framework import serializers
from .models import Doctor, Availability, Appointment

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = '__all__'

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.ReadOnlyField(source='doctor.name')
    specialty = serializers.ReadOnlyField(source='doctor.specialty')
    
    class Meta:
        model = Appointment
        fields = '__all__'
