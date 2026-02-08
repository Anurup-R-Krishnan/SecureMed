from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Doctor, Appointment
from .serializers import DoctorSerializer, AppointmentSerializer
import uuid

class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Doctor.objects.filter(is_active=True, is_available=True)
        specialty = self.request.query_params.get('specialty', None)
        search = self.request.query_params.get('search', None)
        
        if specialty:
            queryset = queryset.filter(specialization__iexact=specialty)
        
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) | 
                Q(user__last_name__icontains=search) |
                Q(specialization__icontains=search)
            )
            
        return queryset

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return Appointment.objects.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
            return Appointment.objects.filter(doctor=user.doctor_profile)
        elif user.is_staff: # Admin
            return Appointment.objects.all()
        return Appointment.objects.none()

    def perform_create(self, serializer):
        # Auto-generate appointment_id if not present (model doesn't auto-gen it in save method usually?)
        # Model definition: appointment_id = models.CharField(max_length=20, unique=True, db_index=True)
        # We need to generate it.
        appointment_id = f"APT-{uuid.uuid4().hex[:8].upper()}"
        
        # Ensure user is a patient
        if not hasattr(self.request.user, 'patient_profile'):
             raise serializers.ValidationError("Only patients can book appointments.")
             
        serializer.save(
            patient=self.request.user.patient_profile,
            appointment_id=appointment_id,
            created_by=self.request.user
        )
