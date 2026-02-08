"""
URL routing for telemedicine API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VideoRoomViewSet

router = DefaultRouter()
router.register(r'rooms', VideoRoomViewSet, basename='video-room')

urlpatterns = [
    path('', include(router.urls)),
]
