from django.urls import path
from . import views

# Doctor-specific Epic 8 endpoints
urlpatterns = [
    path('ai-suggestions/', views.ai_suggestions, name='ai_suggestions'),
]
