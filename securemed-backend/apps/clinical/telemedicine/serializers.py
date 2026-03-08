"""
Serializers for telemedicine models.
"""
from rest_framework import serializers
from .models import (
    VideoRoom,
    RoomParticipant,
    AnatomyRegionExplainer,
    ConditionCatalog,
    ConditionPin,
)


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


from .models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'content', 'attachment', 'is_read', 'created_at']
        read_only_fields = ['id', 'conversation', 'sender', 'created_at']
        
    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'created_at', 'updated_at', 'is_active', 'last_message']
        read_only_fields = ['id', 'participants', 'created_at', 'updated_at', 'is_active', 'last_message']
    
    def get_participants(self, obj):
        return [
            {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'role': user.role
            }
            for user in obj.participants.all()
        ]

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None


class AnatomyRegionExplainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnatomyRegionExplainer
        fields = [
            'region_id',
            'title',
            'summary',
            'details',
            'common_symptoms',
            'related_condition_ids',
            'warning_signals',
            'updated_at',
        ]


class ConditionPinSerializer(serializers.ModelSerializer):
    conditionId = serializers.CharField(source='condition.condition_id', read_only=True)
    id = serializers.CharField(source='pin_id', read_only=True)

    class Meta:
        model = ConditionPin
        fields = ['id', 'conditionId', 'region_id', 'label', 'text', 'severity', 'sort_order']


class ConditionCatalogListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConditionCatalog
        fields = ['condition_id', 'name', 'overview', 'regions', 'typical_symptoms']


class ConditionVisualizationSerializer(serializers.ModelSerializer):
    pins = ConditionPinSerializer(many=True, read_only=True)

    class Meta:
        model = ConditionCatalog
        fields = [
            'condition_id',
            'name',
            'overview',
            'regions',
            'typical_symptoms',
            'seek_care_rules',
            'pins',
        ]
