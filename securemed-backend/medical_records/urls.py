from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalRecordViewSet, PrescriptionViewSet, VitalSignViewSet, patient_dashboard_stats
from .signing import sign_prescription, verify_prescription_signature

router = DefaultRouter()
router.register(r'records', MedicalRecordViewSet, basename='medical-record')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'vitals', VitalSignViewSet, basename='vitals')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', patient_dashboard_stats, name='patient-dashboard-stats'),
    # Prescription signing endpoints
    path('prescriptions/<int:prescription_id>/sign/', sign_prescription, name='sign-prescription'),
    path('prescriptions/<int:prescription_id>/verify/', verify_prescription_signature, name='verify-prescription'),
]
