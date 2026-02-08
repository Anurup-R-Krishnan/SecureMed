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
from authentication import views as auth_views
api_v1_patterns = [
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
    path('labs/', include('labs.urls')),
    
    # Patients (Timeline, Profile)
    path('patients/', include('patients.urls')),
    path('billing/', include('billing.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
    # Fallback for non-versioned api/ to v1 for backward compatibility (optional but safer)
    path('api/', include(api_v1_patterns)), 
]
