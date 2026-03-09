from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicalRecordViewSet,
    PrescriptionViewSet,
    VitalSignViewSet,
    DrugInteractionViewSet,
    PharmacyOrderViewSet,
    MedicationAdherenceLogViewSet,
    MedicationHistoryEventViewSet,
    patient_dashboard_stats,
    patient_access_log,
    EmergencyCaseCreateView,
    EmergencyCaseStatusView,
)
from .signing import sign_prescription, verify_prescription_signature
from .timeline_api import patient_timeline

router = DefaultRouter()
router.register(r'records', MedicalRecordViewSet, basename='medical-record')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'vitals', VitalSignViewSet, basename='vitals')
router.register(r'drug-interactions', DrugInteractionViewSet, basename='drug-interactions')
router.register(r'pharmacy-orders', PharmacyOrderViewSet, basename='pharmacy-orders')
router.register(r'medication-adherence', MedicationAdherenceLogViewSet, basename='medication-adherence')
router.register(r'medication-history', MedicationHistoryEventViewSet, basename='medication-history')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', patient_dashboard_stats, name='patient-dashboard-stats'),
    path('my-access-log/', patient_access_log, name='patient-access-log'),
    path('timeline/', patient_timeline, name='patient-timeline'),
    # Prescription signing endpoints
    path('prescriptions/<int:prescription_id>/sign/', sign_prescription, name='sign-prescription'),
    path('prescriptions/<int:prescription_id>/verify/', verify_prescription_signature, name='verify-prescription'),

    # Emergency intake – public endpoints (no auth)
    path('emergency/intake/', EmergencyCaseCreateView.as_view(), name='emergency-intake'),
    path('emergency/status/<str:case_ref>/', EmergencyCaseStatusView.as_view(), name='emergency-status'),
]
