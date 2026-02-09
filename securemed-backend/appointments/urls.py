from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, AppointmentViewSet, ReferralViewSet
from .availability import get_doctor_availability, get_available_doctors, doctor_availability_schedule

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'referrals', ReferralViewSet, basename='referral')

urlpatterns = [
    path('', include(router.urls)),
    # Availability endpoints
    path('doctors/<int:doctor_id>/availability/', get_doctor_availability, name='doctor-availability'),
    path('doctors/available/', get_available_doctors, name='available-doctors'),
    path('doctor/availability/', doctor_availability_schedule, name='doctor-availability-schedule'),
]

