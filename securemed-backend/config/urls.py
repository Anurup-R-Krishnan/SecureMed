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
from authentication import views as auth_views

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
    path('auth/', include('authentication.urls')),
    path('consents/', include('consents.urls')),
    
    # RBAC Test Endpoints
    path('doctor/test-dashboard/', auth_views.doctor_dashboard_test, name='doctor_test'),
    path('patient/test-dashboard/', auth_views.patient_dashboard_test, name='patient_test'),
    path('admin/test-dashboard/', auth_views.admin_dashboard_test, name='admin_test'),

    # Appointments & Medical Records
    path('appointments/', include('appointments.urls')),
    path('medical-records/', include('medical_records.urls')),
    
    # Telemedicine
    path('telemedicine/', include('telemedicine.urls')),
    
    # Analytics (Epic 8)
    path('admin/', include('analytics.urls')),
    
    # Epic 8: Doctor AI Decision Support
    path('doctor/', include('analytics.doctor_urls')),
    
    # Epic 8: Patient FHIR Export
    path('patient/', include('analytics.patient_urls')),
    
    # Epic 4: Labs
    path('notifications/', include('notifications.urls')),
    path('labs/', include('labs.urls')),
    
    # Patients (Timeline, Profile)
    path('patients/', include('patients.urls')),
    path('billing/', include('billing.urls')),
]

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/', include(api_patterns)),
]
