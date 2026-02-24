"""
URL routing for telemedicine API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VideoRoomViewSet, ConversationViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'rooms', VideoRoomViewSet, basename='video-room')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]
