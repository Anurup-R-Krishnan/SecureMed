"""
Telemedicine API views for video room management.
"""
import json
import re
import socket as _socket
import time

# httpx (used by google-genai) tries IPv6 first; Docker containers typically
# have no IPv6 route, causing immediate ENETUNREACH before any IPv4 fallback.
# Restrict IPv4-only resolution to Google AI hosts to avoid global side effects.
_orig_getaddrinfo = _socket.getaddrinfo
_GEMINI_HOST_HINTS = (
    "googleapis.com",
    "generativelanguage.googleapis.com",
    "google.com",
)


def _ipv4_prefer_gemini_hosts_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    host_str = (host or "").lower() if isinstance(host, str) else ""
    if any(hint in host_str for hint in _GEMINI_HOST_HINTS):
        return _orig_getaddrinfo(host, port, _socket.AF_INET, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)


_socket.getaddrinfo = _ipv4_prefer_gemini_hosts_getaddrinfo

from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

try:
    from google import genai as google_genai
    from google.genai import types as genai_types
    _genai_client = (
        google_genai.Client(
            api_key=settings.GOOGLE_GEMINI_API_KEY,
            http_options=genai_types.HttpOptions(timeout=90_000),  # 90 s in ms — gunicorn timeout is 120 s
        )
        if settings.GOOGLE_GEMINI_API_KEY
        else None
    )
    GEMINI_AVAILABLE = bool(_genai_client)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"[GEMINI INIT] unavailable: {_e}")
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
    POST /api/telemedicine/triage/chat/
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

        # Models to try in order — pick fastest available models for this key
        models_to_try = [
            'gemini-2.5-flash-lite',   # fastest / lightest
            'gemini-2.5-flash',        # fallback
        ]
        last_err = None
        reply_text = None
        for i, model_name in enumerate(models_to_try):
            if i > 0:
                time.sleep(1)  # brief pause between retries to respect rate limits
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
                err_lower = str(me).lower()
                is_retryable = (
                    '429' in str(me)
                    or 'quota' in err_lower
                    or 'timed out' in err_lower
                    or 'timeout' in err_lower
                    or '404' in str(me)
                    or 'not found' in err_lower
                    or 'not_found' in err_lower
                )
                if not is_retryable:
                    raise  # Hard error — don't retry
                continue  # Rate-limit or timeout — try next model

        if reply_text is None:
            last_err_str = str(last_err) if last_err else 'unknown'
            last_err_lower = last_err_str.lower()
            if '429' in last_err_str or 'quota' in last_err_lower:
                return Response(
                    {"error": "The AI service has hit its free-tier daily quota. Quota resets at midnight Pacific Time (≈ 1:30 PM IST). Please try again later."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return Response(
                {"error": f"AI service error: {last_err_str[:300]}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        is_final = "**Possible Issue:**" in reply_text
        return Response({"reply": reply_text, "is_final": is_final}, status=status.HTTP_200_OK)
    except Exception as e:
        err_str = str(e)
        err_lower = err_str.lower()
        if '429' in err_str or 'quota' in err_lower or 'timed out' in err_lower or 'timeout' in err_lower:
            return Response(
                {"error": "The AI service has hit its free-tier daily quota. Quota resets at midnight Pacific Time (≈ 1:30 PM IST). Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response(
            {"error": f"AI service error: {err_str}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

from .models import RoomParticipant, VideoRoom
from .serializers import VideoRoomSerializer


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

    def create(self, request, *args, **kwargs):
        """
        Accept either a patient user ID (expected by serializer)
        or a Patient profile ID via `patient` / `patient_id` and map it.
        """
        data = request.data.copy()
        patient_value = data.get('patient_id') or data.get('patient')
        if patient_value:
            try:
                from apps.accounts.patients.models import Patient as PatientProfile
                patient_profile = PatientProfile.objects.select_related('user').filter(pk=int(patient_value)).first()
                if patient_profile:
                    data['patient'] = patient_profile.user_id
            except (TypeError, ValueError):
                pass

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
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
from .serializers import (
    AnatomyRegionExplainerSerializer,
    ConditionCatalogListSerializer,
    ConditionVisualizationSerializer,
    ConversationSerializer,
    MessageSerializer,
)


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


# ============================================
# Triage Handover Views
# ============================================

from django.contrib.auth import get_user_model

from .models import AnatomyRegionExplainer, ConditionCatalog, TriageRequest

_User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_triage_request(request):
    """
    Patient submits a triage handover to a doctor.

    POST /api/telemedicine/triage/submit/
    Body: { "doctor_id": <int>, "ai_summary": "<text>" }
    """
    doctor_id = request.data.get('doctor_id')
    ai_summary = request.data.get('ai_summary', '').strip()

    if not doctor_id:
        return Response({'error': 'doctor_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not ai_summary:
        return Response({'error': 'ai_summary is required.'}, status=status.HTTP_400_BAD_REQUEST)

    doctor = get_object_or_404(_User, id=doctor_id, role='doctor')

    triage = TriageRequest.objects.create(
        patient=request.user,
        doctor=doctor,
        ai_summary=ai_summary,
        status='PENDING',
    )

    return Response({
        'message': 'Triage request submitted successfully.',
        'triage_id': triage.id,
        'doctor': doctor.get_full_name() or doctor.username,
        'status': triage.status,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_triage_inbox(request):
    """
    Doctor retrieves all PENDING triage requests addressed to them.

    GET /api/telemedicine/triage/inbox/
    """
    if getattr(request.user, 'role', None) != 'doctor':
        return Response({'error': 'Only doctors can view the triage inbox.'}, status=status.HTTP_403_FORBIDDEN)

    requests_qs = TriageRequest.objects.filter(
        doctor=request.user,
        status='PENDING',
    ).select_related('patient')

    data = [
        {
            'triage_id': t.id,
            'patient_name': t.patient.get_full_name() or t.patient.username,
            'ai_summary': t.ai_summary,
            'created_at': t.created_at.isoformat(),
        }
        for t in requests_qs
    ]

    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_triage_request(request):
    """
    Doctor approves (or declines) a triage request.

    POST /api/telemedicine/triage/approve/
    Body: { "triage_id": <int>, "action": "APPROVED" | "DECLINED" }
    """
    if getattr(request.user, 'role', None) != 'doctor':
        return Response({'error': 'Only doctors can act on triage requests.'}, status=status.HTTP_403_FORBIDDEN)

    triage_id = request.data.get('triage_id')
    action_value = request.data.get('action', 'APPROVED').upper()

    if not triage_id:
        return Response({'error': 'triage_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if action_value not in ('APPROVED', 'DECLINED'):
        return Response({'error': 'action must be APPROVED or DECLINED.'}, status=status.HTTP_400_BAD_REQUEST)

    triage = get_object_or_404(TriageRequest, id=triage_id, doctor=request.user)
    triage.status = action_value
    triage.save(update_fields=['status'])

    return Response({
        'message': f'Triage request {action_value.lower()} successfully.',
        'triage_id': triage.id,
        'status': triage.status,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def triage_status_check(request, triage_id):
    """
    Patient polls for the approval status of their triage request.

    GET /api/telemedicine/triage/status/<triage_id>/
    Returns: { "triage_id": int, "status": "PENDING" | "APPROVED" | "DECLINED" }
    """
    triage = get_object_or_404(TriageRequest, id=triage_id, patient=request.user)
    return Response({
        'triage_id': triage.id,
        'status': triage.status,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def anatomy_region_explainer(request):
    """
    Returns educational anatomy explainer content for one selected region.

    GET /api/telemedicine/anatomy/explainers/?region=<region_id>&role=<patient|doctor>
    """
    region_id = (request.query_params.get('region') or '').strip().lower()
    if not region_id:
        return Response({'error': 'region query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

    explainer = get_object_or_404(
        AnatomyRegionExplainer.objects.filter(is_active=True),
        region_id=region_id,
    )
    return Response(AnatomyRegionExplainerSerializer(explainer).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_condition_catalog(request):
    """
    Returns condition cards used by anatomy condition visualization UI.

    GET /api/telemedicine/conditions/?scope=<scope>&role=<patient|doctor>
    """
    scope = (request.query_params.get('scope') or 'top20').strip()
    conditions = ConditionCatalog.objects.filter(
        is_active=True,
        scope=scope,
    ).order_by('name')
    serializer = ConditionCatalogListSerializer(conditions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def condition_visualization(request, condition_id):
    """
    Returns a full condition payload including 3D annotation pins.

    GET /api/telemedicine/conditions/<condition_id>/visualization/?role=<patient|doctor>
    """
    condition = get_object_or_404(
        ConditionCatalog.objects.filter(is_active=True).prefetch_related('pins'),
        condition_id=condition_id,
    )
    payload = ConditionVisualizationSerializer(condition).data

    # AI-generated pain profile (cached) to avoid static/dummy mappings.
    # Fail soft: if the AI call errors (key, quota, network), fall back to the
    # curated static payload instead of returning a 500 to the patient.
    if GEMINI_AVAILABLE:
        try:
            cache_key = f"telemedicine:condition-pain-profile:{condition.condition_id}"
            ai_profile = cache.get(cache_key)
            if not ai_profile:
                ai_profile = _generate_condition_pain_profile(condition)
                if ai_profile:
                    cache.set(cache_key, ai_profile, 60 * 60 * 6)  # 6h cache
            if ai_profile:
                payload['region_pain_levels'] = ai_profile.get('region_pain_levels', payload.get('region_pain_levels', {}))
                payload['pain_interpretations'] = ai_profile.get('pain_interpretations', payload.get('pain_interpretations', {}))
        except Exception:
            # Static payload already reflects the curated catalog; keep serving it.
            pass

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def match_conditions_by_pain(request):
    """
    Matches likely conditions for a body-region + pain input profile.

    POST /api/telemedicine/conditions/match/
    Body: {
      "regions": ["chest", "abdomen"],
      "intensityByRegion": {"chest": 7, "abdomen": 8}
    }
    """
    regions = request.data.get('regions') or []
    intensity_by_region = request.data.get('intensityByRegion') or {}

    if not isinstance(regions, list) or not regions:
        return Response({'error': 'regions must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(intensity_by_region, dict):
        return Response({'error': 'intensityByRegion must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

    selected_regions = [str(r).strip().lower() for r in regions if str(r).strip()]
    if not selected_regions:
        return Response({'error': 'regions must include at least one valid region id.'}, status=status.HTTP_400_BAD_REQUEST)

    normalized_intensity = {}
    for region_id, value in intensity_by_region.items():
        try:
            level = int(value)
        except (TypeError, ValueError):
            level = 5
        normalized_intensity[str(region_id).strip().lower()] = max(1, min(10, level))

    if not GEMINI_AVAILABLE:
        # Heuristic fallback: rank by region overlap + average pain intensity.
        region_set = set(selected_regions)
        matches = []
        for condition in ConditionCatalog.objects.filter(is_active=True).order_by('name'):
            condition_regions = [str(r).strip().lower() for r in (condition.regions or []) if str(r).strip()]
            if not condition_regions:
                continue
            overlap = region_set.intersection(condition_regions)
            if not overlap:
                continue
            coverage = len(overlap) / max(len(condition_regions), 1)
            avg_pain = sum(normalized_intensity.get(r, 5) for r in overlap) / max(len(overlap), 1)
            intensity_score = avg_pain / 10
            confidence = min(0.95, (0.6 * coverage) + (0.4 * intensity_score))
            matches.append({
                'condition_id': condition.condition_id,
                'name': condition.name,
                'confidence': round(confidence * 100),
                'matched_regions': list(overlap),
                'typical_symptoms': condition.typical_symptoms or [],
                'reasoning': f"Matches {len(overlap)} region(s) with average pain {round(avg_pain, 1)}/10.",
            })
        matches.sort(key=lambda item: item['confidence'], reverse=True)
        return Response({'matches': matches[:5], 'mode': 'heuristic'}, status=status.HTTP_200_OK)

    catalog_payload = []
    for condition in ConditionCatalog.objects.filter(is_active=True).order_by('name'):
        catalog_payload.append({
            'condition_id': condition.condition_id,
            'name': condition.name,
            'regions': condition.regions or [],
            'typical_symptoms': condition.typical_symptoms or [],
            'overview': condition.overview or '',
        })

    try:
        matches = _match_conditions_with_gemini(
            selected_regions=selected_regions,
            intensity_by_region=normalized_intensity,
            catalog_payload=catalog_payload,
        )
    except Exception as exc:
        return Response({'error': f'Condition match failed: {str(exc)[:220]}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({'matches': matches}, status=status.HTTP_200_OK)


def _extract_first_json_object(raw_text):
    if not raw_text:
        return None
    raw_text = raw_text.strip()
    try:
        return json.loads(raw_text)
    except Exception:
        pass
    match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _normalize_ai_pain_profile(profile, regions):
    if not isinstance(profile, dict):
        return None
    region_set = {str(r).strip().lower() for r in regions}
    if not region_set:
        return None

    ai_levels = profile.get('region_pain_levels') or {}
    ai_interpretations = profile.get('pain_interpretations') or {}
    normalized_levels = {}
    normalized_interpretations = {}

    for region_id in region_set:
        try:
            level = int(ai_levels.get(region_id, 5))
        except (TypeError, ValueError):
            level = 5
        normalized_levels[region_id] = max(1, min(10, level))

        rules = ai_interpretations.get(region_id, [])
        if not isinstance(rules, list):
            rules = []
        cleaned_rules = []
        for rule in rules:
            if not isinstance(rule, dict):
                continue
            try:
                min_level = max(1, min(10, int(rule.get('min', 1))))
                max_level = max(1, min(10, int(rule.get('max', 10))))
            except (TypeError, ValueError):
                continue
            message = str(rule.get('message', '')).strip()
            urgency = str(rule.get('urgency', 'soon')).strip().lower()
            if not message:
                continue
            cleaned_rules.append({
                'min': min(min_level, max_level),
                'max': max(min_level, max_level),
                'message': message[:280],
                'urgency': urgency if urgency in {'routine', 'soon', 'emergency'} else 'soon',
            })
        normalized_interpretations[region_id] = cleaned_rules

    return {
        'region_pain_levels': normalized_levels,
        'pain_interpretations': normalized_interpretations,
    }


def _generate_condition_pain_profile(condition):
    prompt = (
        "You are a clinical pain-pattern assistant. "
        "Return STRICT JSON only with keys region_pain_levels and pain_interpretations.\n"
        "For each region, estimate pain 1-10 and provide 2-3 interpretation rules "
        "with fields: min,max,message,urgency(routine|soon|emergency).\n"
        "Do not add any markdown.\n\n"
        f"Condition: {condition.name}\n"
        f"Overview: {condition.overview}\n"
        f"Regions: {json.dumps(condition.regions or [])}\n"
        f"Typical symptoms: {json.dumps(condition.typical_symptoms or [])}\n"
    )
    response = _genai_client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents=[{'role': 'user', 'parts': [{'text': prompt}]}],
    )
    parsed = _extract_first_json_object(response.text or '')
    return _normalize_ai_pain_profile(parsed, condition.regions or [])


def _match_conditions_with_gemini(selected_regions, intensity_by_region, catalog_payload):
    prompt = (
        "You are a triage ranking assistant. Rank likely conditions based on pain map input.\n"
        "Output STRICT JSON object: {\"matches\":[...]}\n"
        "Each match item fields: condition_id,name,confidence(0-100 integer),matched_regions(array),"
        "typical_symptoms(array up to 5),reasoning(short string)\n"
        "Return top 10 max, sorted descending confidence.\n\n"
        f"Selected regions: {json.dumps(selected_regions)}\n"
        f"Intensity by region: {json.dumps(intensity_by_region)}\n"
        f"Condition catalog: {json.dumps(catalog_payload)}\n"
    )
    response = _genai_client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents=[{'role': 'user', 'parts': [{'text': prompt}]}],
    )
    parsed = _extract_first_json_object(response.text or '')
    if not isinstance(parsed, dict):
        return []

    raw_matches = parsed.get('matches', [])
    if not isinstance(raw_matches, list):
        return []

    normalized = []
    for item in raw_matches[:10]:
        if not isinstance(item, dict):
            continue
        condition_id = str(item.get('condition_id', '')).strip()
        name = str(item.get('name', '')).strip()
        if not condition_id or not name:
            continue
        try:
            confidence = int(item.get('confidence', 0))
        except (TypeError, ValueError):
            confidence = 0
        confidence = max(0, min(100, confidence))
        matched_regions = item.get('matched_regions') if isinstance(item.get('matched_regions'), list) else []
        matched_regions = [str(r).strip().lower() for r in matched_regions if str(r).strip()]
        typical_symptoms = item.get('typical_symptoms') if isinstance(item.get('typical_symptoms'), list) else []
        typical_symptoms = [str(s).strip() for s in typical_symptoms[:5] if str(s).strip()]
        reasoning = str(item.get('reasoning', '')).strip()[:220]

        normalized.append({
            'condition_id': condition_id,
            'name': name,
            'confidence': confidence,
            'matched_regions': matched_regions,
            'typical_symptoms': typical_symptoms,
            'reasoning': reasoning,
        })

    normalized.sort(key=lambda x: x['confidence'], reverse=True)
    return normalized
