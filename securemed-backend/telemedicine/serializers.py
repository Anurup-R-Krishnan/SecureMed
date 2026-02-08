"""
Serializers for telemedicine models.
"""
from rest_framework import serializers
from .models import VideoRoom, RoomParticipant


class RoomParticipantSerializer(serializers.ModelSerializer):
    """Serializer for room participants."""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = RoomParticipant
        fields = [
            'id', 'user', 'username', 'role', 
            'joined_at', 'left_at', 
            'is_in_waiting_room', 'is_admitted',
            'connection_quality'
        ]
        read_only_fields = ['joined_at', 'left_at']


class VideoRoomSerializer(serializers.ModelSerializer):
    """Serializer for video rooms."""
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    participants = RoomParticipantSerializer(many=True, read_only=True)
    call_duration = serializers.ReadOnlyField()
    join_url = serializers.ReadOnlyField()
    
    class Meta:
        model = VideoRoom
        fields = [
            'id', 'room_id', 
            'doctor', 'doctor_name',
            'patient', 'patient_name',
            'status', 'reason',
            'created_at', 'started_at', 'ended_at',
            'scheduled_for', 'call_duration', 'join_url',
            'participants'
        ]
        read_only_fields = ['room_id', 'doctor', 'created_at', 'started_at', 'ended_at']
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.last_name}" if obj.doctor else None
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else None
