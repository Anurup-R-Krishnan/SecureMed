"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from apps.accounts.users import views as auth_views
from apps.platform.core.health_views import HealthCheckView, ReadinessCheckView, LivenessCheckView

def api_root(request):
    return JsonResponse({
        'message': 'SecureMed API',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'auth': '/api/auth/',
            'patients': '/api/patients/',
            'appointments': '/api/appointments/',
            'medical_records': '/api/medical-records/',
            'telemedicine': '/api/telemedicine/',
            'labs': '/api/labs/',
        }
    })
api_patterns = [
    path('auth/', include('apps.accounts.users.urls')),
    path('consents/', include('apps.accounts.compliance.urls')),
    
    path('doctor/test-dashboard/', auth_views.doctor_dashboard_test, name='doctor_test'),
    path('patient/test-dashboard/', auth_views.patient_dashboard_test, name='patient_test'),
    path('admin/test-dashboard/', auth_views.admin_dashboard_test, name='admin_test'),

    path('appointments/', include('apps.scheduling.appointments.urls')),
    path('medical-records/', include('apps.clinical.records.urls')),
    path('telemedicine/', include('apps.clinical.telemedicine.urls')),
    path('admin/', include('apps.platform.analytics.urls')),
    path('doctor/', include('apps.platform.analytics.doctor_urls')),
    path('patient/', include('apps.platform.analytics.patient_urls')),
    path('labs/', include('apps.clinical.diagnostics.urls')),
    path('platform/voice/', include('apps.platform.accessibility.urls')),
    path('pharmacy/', include('apps.clinical.pharmacy.urls')),
    path('patients/', include('apps.accounts.patients.urls')),
    path('billing/', include('apps.finance.billing.urls')),
    path('infection-tracking/', include('apps.clinical.infection_tracking.urls')),
]


urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root-prefixed'),
    path('api/', include(api_patterns)),
    
    # Health check endpoints
    path('health/', HealthCheckView.as_view(), name='health'),
    path('health/ready/', ReadinessCheckView.as_view(), name='readiness'),
    path('health/live/', LivenessCheckView.as_view(), name='liveness'),
]
