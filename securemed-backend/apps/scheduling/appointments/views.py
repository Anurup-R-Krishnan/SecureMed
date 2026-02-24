from django.shortcuts import render
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.utils import timezone
from .models import Doctor, Appointment, Referral
from .serializers import DoctorSerializer, AppointmentSerializer, ReferralSerializer
from apps.accounts.users.permissions import IsDoctor
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
              

        patient_profile = self.request.user.patient_profile
        if not patient_profile.insurance_provider or not patient_profile.insurance_number:
            pass 
        else:

            pass

        # Prevent double booking
        appointment_time = serializer.validated_data.get('appointment_time')
        appointment_date = serializer.validated_data.get('appointment_date')
        doctor = serializer.validated_data.get('doctor')
        if Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status__in=['scheduled', 'confirmed', 'in_progress']
        ).exists():
            raise serializers.ValidationError({
                'appointment_time': 'This time slot is already booked for the selected doctor.'
            })

        # Validate against doctor availability schedule (if configured)
        from .models import DoctorAvailabilitySlot
        slots = DoctorAvailabilitySlot.objects.filter(
            doctor=doctor,
            date=appointment_date,
            is_active=True
        )
        if slots.exists():
            in_available = slots.filter(
                slot_type='available',
                start_time__lte=appointment_time,
                end_time__gt=appointment_time
            ).exists()
            in_blocked = slots.filter(
                slot_type__in=['surgery', 'break'],
                start_time__lte=appointment_time,
                end_time__gt=appointment_time
            ).exists()
            if not in_available or in_blocked:
                raise serializers.ValidationError({
                    'appointment_time': 'Selected time is outside the doctor availability.'
                })

        appointment = serializer.save(
            patient=self.request.user.patient_profile,
            appointment_id=appointment_id,
            created_by=self.request.user
        )
        
        # Send confirmation (Email + SMS)
        from apps.platform.core.notifications import NotificationService
        NotificationService.send_appointment_confirmation(appointment)
        NotificationService.send_appointment_sms_reminder(appointment)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Doctor confirms a scheduled appointment"""
        appointment = self.get_object()
        if not hasattr(request.user, 'doctor_profile') or appointment.doctor != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned doctor can accept this appointment.")
        if appointment.status != 'scheduled':
            return Response({"error": "Can only accept scheduled appointments."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = 'confirmed'
        appointment.save()
        from .models import AppointmentHistory
        AppointmentHistory.objects.create(appointment=appointment, status='confirmed', changed_by=request.user, reason='Doctor confirmed appointment')
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    def start_consultation(self, request, pk=None):
        """Doctor starts a consultation (in-person or telehealth)"""
        appointment = self.get_object()
        if not hasattr(request.user, 'doctor_profile') or appointment.doctor != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned doctor can start this consultation.")
        if appointment.status != 'confirmed':
            return Response({"error": "Can only start consultation on confirmed appointments."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = 'in_progress'
        appointment.save()
        from .models import AppointmentHistory
        AppointmentHistory.objects.create(appointment=appointment, status='in_progress', changed_by=request.user, reason='Consultation started')
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    def complete_consultation(self, request, pk=None):
        """Doctor marks consultation as completed"""
        appointment = self.get_object()
        if not hasattr(request.user, 'doctor_profile') or appointment.doctor != request.user.doctor_profile:
            raise PermissionDenied("Only the assigned doctor can complete this consultation.")
        if appointment.status != 'in_progress':
            return Response({"error": "Can only complete an in-progress consultation."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = 'completed'
        notes = request.data.get('notes', '')
        if notes:
            appointment.notes = notes
        appointment.save()
        from .models import AppointmentHistory
        AppointmentHistory.objects.create(appointment=appointment, status='completed', changed_by=request.user, reason=notes or 'Consultation completed')
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an appointment (patient or doctor)"""
        appointment = self.get_object()
        user = request.user
        is_patient = hasattr(user, 'patient_profile') and appointment.patient == user.patient_profile
        is_doctor = hasattr(user, 'doctor_profile') and appointment.doctor == user.doctor_profile
        if not is_patient and not is_doctor and not user.is_staff:
            raise PermissionDenied("You don't have permission to cancel this appointment.")
        if appointment.status in ['completed', 'cancelled']:
            return Response({"error": "Cannot cancel a completed or already cancelled appointment."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = 'cancelled'
        appointment.save()
        from .models import AppointmentHistory
        AppointmentHistory.objects.create(appointment=appointment, status='cancelled', changed_by=request.user, reason=request.data.get('reason', 'Cancelled'))
        return Response(AppointmentSerializer(appointment).data) 


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
            # Handle empty first_name/last_name with fallback
            first_name = ref.patient.user.first_name or ''
            last_name = ref.patient.user.last_name or ''
            full_name = f"{first_name} {last_name}".strip()
            display_name = full_name or ref.patient.user.email or ref.patient.patient_id or 'Unknown Patient'
            
            patients_data.append({
                'id': ref.patient.id,
                'patient_id': ref.patient.patient_id,
                'name': display_name,
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

    @action(detail=True, methods=['post'])
    def override_specialist(self, request, pk=None):
        """Admin override to reassign specialist for staffing changes."""
        if not request.user.is_staff and request.user.role != 'admin':
            raise PermissionDenied("Only admins can override referral assignments.")

        referral = self.get_object()
        specialist_id = request.data.get('specialist_id')
        if not specialist_id:
            return Response({"error": "specialist_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.scheduling.availability.models import Doctor
            new_specialist = Doctor.objects.get(id=specialist_id)
        except Doctor.DoesNotExist:
            return Response({"error": "Specialist not found."}, status=status.HTTP_404_NOT_FOUND)

        referral.specialist = new_specialist
        referral.status = 'pending'
        referral.grant_access(days=30)
        return Response(ReferralSerializer(referral).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def patient_referrals_view(request):
    """
    Patient-facing endpoint to view their own referrals.
    GET /api/appointments/my-referrals/
    """
    user = request.user
    if not hasattr(user, 'patient_profile'):
        return Response({"error": "Only patients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
    
    patient = user.patient_profile
    referrals = Referral.objects.filter(patient=patient).select_related(
        'referring_doctor__user',
        'specialist__user',
        'specialist__department',
        'patient__user'
    ).order_by('-created_at')
    
    data = []
    for ref in referrals:
        data.append({
            'id': ref.id,
            'referral_id': ref.referral_id,
            'referring_doctor_name': f"Dr. {ref.referring_doctor.user.get_full_name()}".strip() if ref.referring_doctor else '',
            'referring_doctor_specialization': ref.referring_doctor.specialization if ref.referring_doctor else '',
            'specialist_id': ref.specialist.id if ref.specialist else None,
            'specialist_name': f"Dr. {ref.specialist.user.get_full_name()}".strip() if ref.specialist else '',
            'specialist_specialization': ref.specialist.specialization if ref.specialist else '',
            'specialist_department': ref.specialist.department.name if ref.specialist and ref.specialist.department else '',
            'status': ref.status,
            'status_display': ref.get_status_display(),
            'priority': ref.priority,
            'priority_display': ref.get_priority_display(),
            'reason': ref.reason,
            'clinical_notes': ref.clinical_notes,
            'created_at': ref.created_at,
            'updated_at': ref.updated_at,
        })
    
    return Response(data)
