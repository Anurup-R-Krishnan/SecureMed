from django.shortcuts import render
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.utils import timezone
from .models import Doctor, Appointment, Referral
from .serializers import DoctorSerializer, AppointmentSerializer, ReferralSerializer
from authentication.permissions import IsDoctor
import uuid

class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.AllowAny]
    
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

    @action(detail=True, methods=['get'])
    def available_slots(self, request, pk=None):
        doctor = self.get_object()
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response({"error": "Date parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from datetime import datetime, timedelta
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        slots = []
        start_time = datetime.combine(date, datetime.min.time()).replace(hour=9)
        end_time = datetime.combine(date, datetime.min.time()).replace(hour=17)
        
        current = start_time
        while current < end_time:
            time_str = current.strftime('%H:%M')
            
            is_booked = Appointment.objects.filter(
                doctor=doctor,
                appointment_date=date,
                appointment_time__hour=current.hour,
                appointment_time__minute=current.minute,
                status__in=['scheduled', 'confirmed']
            ).exists()
            
            slots.append({
                "time": time_str,
                "available": not is_booked
            })
            current += timedelta(minutes=30)
            
        return Response(slots)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return Appointment.objects.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
            return Appointment.objects.filter(doctor=user.doctor_profile)
        elif user.is_staff:
            return Appointment.objects.all()
        return Appointment.objects.none()

    def perform_create(self, serializer):
        from datetime import datetime, timedelta
        
        appointment_id = f"APT-{uuid.uuid4().hex[:8].upper()}"
        
        if not hasattr(self.request.user, 'patient_profile'):
            raise PermissionDenied(
                f"Patient profile not found for user '{self.request.user.email}'. "
                "Please complete your patient registration first."
            )
        
        # Validate appointment date
        appointment_date = serializer.validated_data.get('appointment_date')
        if appointment_date:
            today = timezone.now().date()
            max_future_date = today + timedelta(days=180)  # 6 months
            
            if appointment_date < today:
                raise serializers.ValidationError({
                    'appointment_date': 'Cannot book appointments in the past'
                })
            
            if appointment_date > max_future_date:
                raise serializers.ValidationError({
                    'appointment_date': 'Cannot book appointments more than 6 months in advance'
                })
              
        appointment = serializer.save(
            patient=self.request.user.patient_profile,
            appointment_id=appointment_id,
            created_by=self.request.user
        )
        
        # Send confirmation (Email + SMS)
        from core.notifications import NotificationService
        NotificationService.send_appointment_confirmation(appointment)
        NotificationService.send_appointment_sms_reminder(appointment) 


class ReferralViewSet(viewsets.ModelViewSet):
    """
    Story 3.4: Patient Assignment
    Handles referral workflow for cross-department patient access
    """
    serializer_class = ReferralSerializer
    permission_classes = [IsDoctor]
    
    def get_queryset(self):
        """Optimize queryset with select_related to prevent N+1 queries"""
        user = self.request.user
        base_queryset = Referral.objects.select_related(
            'referring_doctor__user',
            'specialist__user',
            'patient__user'
        )
        
        if hasattr(user, 'doctor_profile'):
            doctor = user.doctor_profile
            # Show referrals made by this doctor OR received by this doctor
            return base_queryset.filter(
                Q(referring_doctor=doctor) | Q(specialist=doctor)
            )
        elif user.is_staff:
            return base_queryset.all()
        return Referral.objects.none()
    
    def perform_create(self, serializer):
        """Create referral and auto-generate ID"""
        if not hasattr(self.request.user, 'doctor_profile'):
            raise PermissionDenied("Only doctors can create referrals.")
        
        referral_id = f"REF-{uuid.uuid4().hex[:8].upper()}"
        referral = serializer.save(
            referral_id=referral_id,
            referring_doctor=self.request.user.doctor_profile
        )
        # Auto-grant 30-day access upon creation
        referral.grant_access(days=30)
    
    @action(detail=False, methods=['get'])
    def my_patients(self, request):
        """Get all patients referred TO the current doctor (My Patients list)"""
        if not hasattr(request.user, 'doctor_profile'):
            return Response({"error": "Only doctors can access this."}, status=status.HTTP_403_FORBIDDEN)
        
        doctor = request.user.doctor_profile
        # Get active referrals where this doctor is the specialist
        referrals = Referral.objects.filter(
            specialist=doctor,
            status__in=['pending', 'accepted'],
            access_granted=True
        ).select_related('patient', 'patient__user', 'referring_doctor', 'referring_doctor__user')
        
        patients_data = []
        for ref in referrals:
            patients_data.append({
                'id': ref.patient.id,
                'patient_id': ref.patient.patient_id,
                'name': f"{ref.patient.user.first_name} {ref.patient.user.last_name}",
                'referral_id': ref.referral_id,
                'referred_by': f"Dr. {ref.referring_doctor.user.get_full_name()}",
                'reason': ref.reason,
                'priority': ref.priority,
                'access_expires_at': ref.access_expires_at,
                'created_at': ref.created_at,
            })
        
        return Response(patients_data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a pending referral"""
        referral = self.get_object()
        
        if referral.specialist != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned specialist can accept this referral.")
        
        if referral.status != 'pending':
            return Response({"error": "Can only accept pending referrals."}, status=status.HTTP_400_BAD_REQUEST)
        
        referral.status = 'accepted'
        referral.save()
        return Response(ReferralSerializer(referral).data)
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline a referral"""
        referral = self.get_object()
        
        if referral.specialist != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned specialist can decline this referral.")
        
        referral.status = 'declined'
        referral.revoke_access()
        referral.save()
        return Response(ReferralSerializer(referral).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete a referral and revoke access"""
        referral = self.get_object()
        
        if referral.specialist != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned specialist can complete this referral.")
        
        referral.close_case()
        return Response(ReferralSerializer(referral).data)
    
    @action(detail=True, methods=['post'])
    def extend_access(self, request, pk=None):
        """Extend access period for a referral"""
        referral = self.get_object()
        days = request.data.get('days', 30)
        
        if referral.specialist != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned specialist can extend access.")
        
        referral.grant_access(days=int(days))
        return Response(ReferralSerializer(referral).data)
