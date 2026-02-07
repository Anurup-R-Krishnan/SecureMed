from django.urls import path
from . import views

urlpatterns = [
    # Admin analytics (Epic 8 Story 8.1)
    path('analytics/', views.get_analytics, name='analytics'),
    path('health/', views.health_check, name='health_check'),
]

# These URLs will be added to main config/urls.py:
# path('api/doctor/', include('analytics.doctor_urls')),
# path('api/patient/', include('analytics.patient_urls')),
