from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer

class MedicalRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return MedicalRecord.objects.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
            return MedicalRecord.objects.filter(doctor=user.doctor_profile)
        elif user.is_staff:
            return MedicalRecord.objects.all()
        return MedicalRecord.objects.none()
