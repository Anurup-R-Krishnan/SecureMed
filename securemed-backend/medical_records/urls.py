from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalRecordViewSet, PrescriptionViewSet
from .signing import sign_prescription, verify_prescription_signature

router = DefaultRouter()
router.register(r'records', MedicalRecordViewSet, basename='medical-record')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')

urlpatterns = [
    path('', include(router.urls)),
    # Prescription signing endpoints
    path('prescriptions/<int:prescription_id>/sign/', sign_prescription, name='sign-prescription'),
    path('prescriptions/<int:prescription_id>/verify/', verify_prescription_signature, name='verify-prescription'),
]
