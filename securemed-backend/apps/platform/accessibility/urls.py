from django.urls import path
from .views import VoiceIntentView

urlpatterns = [
    path('intent/', VoiceIntentView.as_view(), name='voice-intent'),
]
