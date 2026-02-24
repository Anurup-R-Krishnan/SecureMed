from django.urls import path
from . import views

urlpatterns = [
    # Admin Dashboard Endpoints
    path('dashboard/stats/', views.get_dashboard_stats, name='dashboard_stats'),
    path('hospitals/', views.get_hospitals, name='hospitals'),
    path('staff/', views.get_staff, name='staff'),
    path('alerts/', views.get_alerts, name='alerts'),
    path('audit-logs/', views.get_audit_logs, name='audit_logs'),
    
    # Clinical Analytics (Epic 8 Story 8.1)
    path('analytics/', views.get_analytics, name='analytics'),
    path('health/', views.health_check, name='health_check'),
]

# These URLs will be added to main config/urls.py:
# path('api/doctor/', include('analytics.doctor_urls')),
# path('api/patient/', include('analytics.patient_urls')),

