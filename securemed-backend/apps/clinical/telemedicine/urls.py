"""
URL routing for telemedicine API.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationViewSet,
    MessageViewSet,
    VideoRoomViewSet,
    ai_triage_chat,
    anatomy_region_explainer,
    approve_triage_request,
    condition_visualization,
    doctor_triage_inbox,
    list_condition_catalog,
    match_conditions_by_pain,
    submit_triage_request,
    triage_status_check,
)

router = DefaultRouter()
router.register(r'rooms', VideoRoomViewSet, basename='video-room')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    # Canonical endpoint
    path('triage/chat/', ai_triage_chat, name='ai-triage-chat'),
    # Backward-compatible alias for older frontend builds.
    path('api/triage/chat/', ai_triage_chat, name='ai-triage-chat-legacy'),
    path('triage/submit/', submit_triage_request, name='triage-submit'),
    path('triage/inbox/', doctor_triage_inbox, name='triage-inbox'),
    path('triage/approve/', approve_triage_request, name='triage-approve'),
    path('triage/status/<int:triage_id>/', triage_status_check, name='triage-status'),
    path('anatomy/explainers/', anatomy_region_explainer, name='anatomy-region-explainer'),
    path('conditions/', list_condition_catalog, name='condition-catalog-list'),
    path('conditions/match/', match_conditions_by_pain, name='condition-match'),
    path('conditions/<str:condition_id>/visualization/', condition_visualization, name='condition-visualization'),
]
