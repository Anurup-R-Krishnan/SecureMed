from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, AppointmentViewSet
from .availability import get_doctor_availability, get_available_doctors

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('', include(router.urls)),
    # Availability endpoints
    path('doctors/<int:doctor_id>/availability/', get_doctor_availability, name='doctor-availability'),
    path('doctors/available/', get_available_doctors, name='available-doctors'),
]
