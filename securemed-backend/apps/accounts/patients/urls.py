from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Create router for ViewSet
router = DefaultRouter()
router.register(r'', views.PatientViewSet, basename='patient')

urlpatterns = [
    # ViewSet routes (DRF with pagination, filtering, field selection)
    # GET    /api/patients/                    - list patients with pagination
    # GET    /api/patients/<id>/               - get patient detail
    # 
    # Query Parameters:
    # - page: Page number (default 1)
    # - page_size: Items per page (default 10, max 100)
    # - search: Search by name, email, or patient_id
    # - fields: Comma-separated list of fields to include
    # - ordering: Order by field (e.g., -updated_at)
    path('', include(router.urls)),
    
    # Legacy function-based routes (kept for backward compatibility)
    path('timeline/', views.patient_timeline, name='patient-timeline'),
    path('profile/', views.profile_details, name='profile-details'),
]
