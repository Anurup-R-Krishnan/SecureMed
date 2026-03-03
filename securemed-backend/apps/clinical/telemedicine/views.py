"""
Telemedicine API views for video room management.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings

try:
    from google import genai as google_genai
    from google.genai import types as genai_types
    _genai_client = google_genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY) if settings.GOOGLE_GEMINI_API_KEY else None
    GEMINI_AVAILABLE = bool(_genai_client)
except Exception:
    _genai_client = None
    GEMINI_AVAILABLE = False

TRIAGE_SYSTEM_PROMPT = (
    "You are an AI Clinical Triage Assistant. Ask exactly ONE question at a time to gather symptoms. "
    "Ask follow-up questions until you have enough information to confidently guess the medical issue, "
    "but you MUST NOT ask more than 6 questions total. Once confident or at the 6-question limit, "
    "STOP asking questions and output ONLY a final summary in this strict Markdown format:\n"
    "**Possible Issue:** [Guess]\n"
    "**Priority Level:** [Low/Medium/High]\n"
    "**Explanation:** [1-2 sentences]\n"
    "**Recommended Next Step:** [Action]"
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_triage_chat(request):
    """
    AI-powered pre-consultation triage chat.
    POST /api/telemedicine/api/triage/chat/
    Body: {"message": "...", "history": [...]}
    """
    if not GEMINI_AVAILABLE:
        return Response(
            {"error": "AI service is not configured. Please set GOOGLE_GEMINI_API_KEY."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    message = request.data.get('message', '').strip()
    history = request.data.get('history', [])

    if not message:
        return Response({"error": "'message' is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Build contents list: prior history + current user message
        contents = []
        for turn in history:
            role = turn.get('role', 'user')
            text = turn.get('parts', [{}])[0].get('text', '') if 'parts' in turn else turn.get('content', '')
            contents.append({'role': role, 'parts': [{'text': text}]})
        contents.append({'role': 'user', 'parts': [{'text': message}]})

        # Models to try in order (fallback chain)
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
        last_err = None
        reply_text = None
        for model_name in models_to_try:
            try:
                response = _genai_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=TRIAGE_SYSTEM_PROMPT,
                    ),
                )
                reply_text = response.text
                break
            except Exception as me:
                last_err = me
                if '429' not in str(me) and 'quota' not in str(me).lower() and '404' not in str(me):
                    raise  # Non-quota error, don't retry other models
                continue  # Try next model

        if reply_text is None:
            err_str = str(last_err)
            return Response(
                {"error": "AI service is temporarily unavailable due to rate limits. Please try again in a few minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        is_final = "**Possible Issue:**" in reply_text
        return Response({"reply": reply_text, "is_final": is_final}, status=status.HTTP_200_OK)
    except Exception as e:
        err_str = str(e)
        if '429' in err_str or 'quota' in err_str.lower():
            return Response(
                {"error": "AI service is temporarily unavailable due to rate limits. Please try again in a few minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response(
            {"error": f"AI service error: {err_str}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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


from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing secure text conversations.
    """
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants').distinct()
    
    def perform_create(self, serializer):
        # Conversations are typically started by finding a doctor/patient pairing
        # This basic create doesn't handle participants logic fully; 
        # usually done via a specific action or signal.
        # For MVP, we presume participants are added after creation or passed in context.
        # But ModelViewSet create doesn't handle M2M well in perform_create easily without custom logic.
        # Let's override create to handle 'participant_id' in data.
        pass

    def create(self, request, *args, **kwargs):
        participant_id = request.data.get('participant_id')
        if not participant_id:
            return Response({'error': 'participant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if conversation already exists between these two
        # (Assuming 1-on-1 for now)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            other_user = User.objects.get(id=participant_id)
        except User.DoesNotExist:
             return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Basic check for existing conversation
        existing = Conversation.objects.filter(participants=request.user).filter(participants=other_user).first()
        if existing:
             return Response(ConversationSerializer(existing).data)

        conversation = Conversation.objects.create()
        conversation.participants.add(request.user, other_user)
        return Response(ConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages within a conversation.
    """
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Message.objects.filter(
            conversation__participants=self.request.user
        ).select_related('sender', 'conversation').order_by('created_at')
        
        conversation_id = self.request.query_params.get('conversation')
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        return queryset
    
    def perform_create(self, serializer):
        conversation_id = self.request.data.get('conversation')
        conversation = get_object_or_404(
            Conversation, 
            id=conversation_id, 
            participants=self.request.user
        )
        serializer.save(sender=self.request.user, conversation=conversation)

