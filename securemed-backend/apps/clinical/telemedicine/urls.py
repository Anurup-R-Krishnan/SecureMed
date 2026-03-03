"""
URL routing for telemedicine API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VideoRoomViewSet, ConversationViewSet, MessageViewSet, ai_triage_chat

router = DefaultRouter()
router.register(r'rooms', VideoRoomViewSet, basename='video-room')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    path('api/triage/chat/', ai_triage_chat, name='ai-triage-chat'),
]
