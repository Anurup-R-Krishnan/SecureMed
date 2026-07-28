from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .availability import (
    doctor_availability_schedule,
    get_available_doctors,
    get_doctor_availability,
)
from .views import (
    AppointmentViewSet,
    DoctorViewSet,
    ReferralViewSet,
    patient_referrals_view,
)

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'referrals', ReferralViewSet, basename='referral')

urlpatterns = [
    # Availability endpoints
    path('doctors/<int:doctor_id>/availability/', get_doctor_availability, name='doctor-availability'),
    path('doctors/available/', get_available_doctors, name='available-doctors'),
    path('doctor/availability/', doctor_availability_schedule, name='doctor-availability-schedule'),
    # Patient-facing referral endpoint
    path('my-referrals/', patient_referrals_view, name='patient-referrals'),
    path('', include(router.urls)),
]
