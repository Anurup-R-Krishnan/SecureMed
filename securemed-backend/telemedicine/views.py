"""
Telemedicine API views for video room management.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import VideoRoom, RoomParticipant
from .serializers import VideoRoomSerializer, RoomParticipantSerializer


class VideoRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing video consultation rooms.
    
    Endpoints:
    - POST /api/telemedicine/rooms/ - Create new room
    - GET /api/telemedicine/rooms/ - List user's rooms
    - GET /api/telemedicine/rooms/{id}/ - Get room details
    - POST /api/telemedicine/rooms/{id}/join/ - Join waiting room
    - POST /api/telemedicine/rooms/{id}/admit/ - Doctor admits patient
    - POST /api/telemedicine/rooms/{id}/start/ - Start the call
    - POST /api/telemedicine/rooms/{id}/end/ - End the call
    """
    serializer_class = VideoRoomSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'room_id'
    
    def get_queryset(self):
        """Return rooms for current user (as doctor or patient)."""
        user = self.request.user
        return VideoRoom.objects.filter(
            models.Q(doctor=user) | models.Q(patient=user)
        ).select_related('doctor', 'patient')
    
    def perform_create(self, serializer):
        """Create room with current user as doctor."""
        serializer.save(doctor=self.request.user)
    
    @action(detail=True, methods=['post'])
    def join(self, request, room_id=None):
        """
        Patient joins the waiting room.
        
        POST /api/telemedicine/rooms/{room_id}/join/
        """
        room = self.get_object()
        user = request.user
        
        # Determine role
        if user == room.patient:
            role = 'patient'
        elif user == room.doctor:
            role = 'doctor'
        else:
            return Response(
                {'error': 'You are not a participant in this room'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create or update participant record
        participant, created = RoomParticipant.objects.get_or_create(
            room=room,
            user=user,
            defaults={'role': role}
        )
        
        if not created:
            # Rejoin
            participant.joined_at = timezone.now()
            participant.left_at = None
            participant.is_in_waiting_room = True if role == 'patient' else False
            participant.save()
        
        return Response({
            'message': 'Joined room successfully',
            'room_id': str(room.room_id),
            'role': role,
            'is_in_waiting_room': participant.is_in_waiting_room,
            'room_status': room.status
        })
    
    @action(detail=True, methods=['post'])
    def admit(self, request, room_id=None):
        """
        Doctor admits patient from waiting room.
        
        POST /api/telemedicine/rooms/{room_id}/admit/
        """
        room = self.get_object()
        user = request.user
        
        # Only doctor can admit
        if user != room.doctor:
            return Response(
                {'error': 'Only the doctor can admit patients'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get patient's participant record
        try:
            patient_participant = RoomParticipant.objects.get(
                room=room,
                role='patient'
            )
        except RoomParticipant.DoesNotExist:
            return Response(
                {'error': 'Patient has not joined yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Admit patient
        patient_participant.admit()
        
        # Start the call
        room.start_call()
        
        return Response({
            'message': 'Patient admitted to call',
            'room_status': room.status,
            'call_started_at': room.started_at.isoformat()
        })
    
    @action(detail=True, methods=['post'])
    def start(self, request, room_id=None):
        """
        Start the video call.
        
        POST /api/telemedicine/rooms/{room_id}/start/
        """
        room = self.get_object()
        
        if room.status == 'active':
            return Response(
                {'error': 'Call is already active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        room.start_call()
        
        return Response({
            'message': 'Call started',
            'room_id': str(room.room_id),
            'started_at': room.started_at.isoformat()
        })
    
    @action(detail=True, methods=['post'])
    def end(self, request, room_id=None):
        """
        End the video call.
        
        POST /api/telemedicine/rooms/{room_id}/end/
        """
        room = self.get_object()
        
        if room.status == 'ended':
            return Response(
                {'error': 'Call has already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        room.end_call()
        
        # Mark all participants as left
        RoomParticipant.objects.filter(room=room, left_at__isnull=True).update(
            left_at=timezone.now()
        )
        
        return Response({
            'message': 'Call ended',
            'room_id': str(room.room_id),
            'duration_minutes': room.call_duration,
            'ended_at': room.ended_at.isoformat()
        })
    
    @action(detail=True, methods=['get'])
    def status_check(self, request, room_id=None):
        """
        Check room status (for polling).
        
        GET /api/telemedicine/rooms/{room_id}/status_check/
        """
        room = self.get_object()
        
        waiting_participants = RoomParticipant.objects.filter(
            room=room, 
            is_in_waiting_room=True
        ).count()
        
        return Response({
            'room_id': str(room.room_id),
            'status': room.status,
            'waiting_count': waiting_participants,
            'started_at': room.started_at.isoformat() if room.started_at else None
        })
    
    @action(detail=True, methods=['post'])
    def rate_quality(self, request, room_id=None):
        """
        Rate connection quality after call.
        
        POST /api/telemedicine/rooms/{room_id}/rate_quality/
        Body: {"rating": 1-5}
        """
        room = self.get_object()
        user = request.user
        rating = request.data.get('rating')
        
        if not rating or not (1 <= int(rating) <= 5):
            return Response(
                {'error': 'Rating must be between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            participant = RoomParticipant.objects.get(room=room, user=user)
            participant.connection_quality = int(rating)
            participant.save()
            
            return Response({
                'message': 'Quality rating saved',
                'rating': participant.connection_quality
            })
        except RoomParticipant.DoesNotExist:
            return Response(
                {'error': 'You are not a participant in this room'},
                status=status.HTTP_404_NOT_FOUND
            )


# Import models for Q object
from django.db import models
