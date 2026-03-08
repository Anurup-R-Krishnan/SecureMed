from django.urls import path
from . import views

# Patient-specific Epic 8 endpoints
urlpatterns = [
    path('export/fhir/', views.fhir_export, name='fhir_export'),
]
