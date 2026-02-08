from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from authentication.permissions import IsPatient

class MedicalRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Optimize queryset with select_related to prevent N+1 queries"""
        user = self.request.user
        base_queryset = MedicalRecord.objects.select_related(
            'doctor__user',
            'patient__user'
        ).prefetch_related('prescriptions')
        
        if hasattr(user, 'patient_profile'):
            return base_queryset.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
            return base_queryset.filter(doctor=user.doctor_profile)
        elif user.is_staff:
            return base_queryset.all()
        return MedicalRecord.objects.none()

    def create(self, request, *args, **kwargs):
        # Allow patients to upload their own records
        if not hasattr(request.user, 'patient_profile') and not request.user.is_staff:
             return Response({"error": "Only patients or staff can upload records."}, status=status.HTTP_403_FORBIDDEN)
        
        # Auto-generate record ID if not provided (frontend might not send it)
        import uuid
        data = request.data.copy()
        if 'record_id' not in data:
            data['record_id'] = f"REC-{uuid.uuid4().hex[:8].upper()}"
        
        # If patient is uploading, force patient field to be themselves
        if hasattr(request.user, 'patient_profile'):
            data['patient'] = request.user.patient_profile.id
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def timeline(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
             return Response({"error": "patient_id is required"}, status=400)
             
        # In a real app, verify access to this patient_id
        
        events = []
        
        # 1. Medical Records
        records = MedicalRecord.objects.filter(patient_id=patient_id)
        for r in records:
            events.append({
                "id": f"rec-{r.id}",
                "date": r.created_at.date(), # Assuming generated field
                "type": "visit", # or logic to determine type
                "title": r.title or "Medical Record",
                "description": r.notes[:50] if r.notes else "",
                "details": [r.notes] if r.notes else []
            })
            
        # 2. Lab Orders (from our new app)
        from labs.models import LabOrder
        orders = LabOrder.objects.filter(patient_id=patient_id)
        for o in orders:
            events.append({
                "id": f"lab-{o.id}",
                "date": o.created_at.date(),
                "type": "lab",
                "title": f"Lab Order #{o.id}",
                "description": f"{o.items.count()} tests ordered",
                "details": [t.name for t in o.items.all()]
            })

        # 3. Appointments
        from appointments.models import Appointment
        appts = Appointment.objects.filter(patient_id=patient_id)
        for a in appts:
             events.append({
                "id": f"apt-{a.id}",
                "date": a.start_time.date(),
                "type": "appointment",
                "title": f"Appointment with Dr. {a.doctor.user.last_name if a.doctor else 'Unknown'}",
                "description": a.status,
                "details": [f"Time: {a.start_time.strftime('%H:%M')}"]
            })
            
        # Sort by date desc
        events.sort(key=lambda x: x['date'], reverse=True)
        
        return Response(events)

    @action(detail=False, methods=['post'])
    def break_glass(self, request):
        """
        Emergency Break-Glass Protocol.
        Grants temporary access and logs the security event.
        """
        patient_id = request.data.get('patient_id')
        reason = request.data.get('reason')
        
        if not patient_id or not reason:
            return Response(
                {"error": "Both patient_id and reason are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        from patients.models import Patient
        try:
            # Try to lookup by patient_id string first (e.g., 'P-10001')
            patient = Patient.objects.filter(patient_id=patient_id).first()
            if not patient:
                # Fallback to user ID lookup
                patient = Patient.objects.get(user__id=patient_id)
        except (Patient.DoesNotExist, ValueError):
            return Response({"error": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        from .models import EmergencyAccessLog
        
        # enhance: check if access is already granted?
        
        # Create Log
        log = EmergencyAccessLog.objects.create(
            patient=patient,
            accessed_by=request.user,
            reason=reason,
            ip_address=request.META.get('REMOTE_ADDR'),
            # expires_at = timezone.now() + timedelta(hours=24) 
        )
        
        # Log to system logger for critical alert
        import logging
        logger = logging.getLogger('security')
        logger.critical(f"BREAK-GLASS EVENT: User {request.user.email} accessed patient {patient.patient_id}. Reason: {reason}")
        
        return Response({
            "status": "access_granted",
            "message": "Emergency access logged and granted.",
            "log_id": log.id
        })


class PrescriptionViewSet(viewsets.ModelViewSet):
    from .models import Prescription
    queryset = Prescription.objects.all()
    # Need to update serializer to include signing fields
    # serializer_class = PrescriptionSerializer 
    permission_classes = [permissions.IsAuthenticated]

    # Dynamically set serializer to avoid circular imports or just use the one from serializers.py
    # For now, let's assume we import it from serializers.py but we need to update it first
    from .serializers import PrescriptionSerializer
    serializer_class = PrescriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        from .models import MedicalRecord
        from django.utils import timezone
        import uuid
        
        patient_id = serializer.validated_data.pop('patient_id')
        doctor_profile = self.request.user.doctor_profile
        
        # Create a Medical Record wrapper for this prescription
        # In a real app, we might group them by visit, but for now 1-to-1 or 1-to-many is fine
        record = MedicalRecord.objects.create(
            record_id=f"REC-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient_id,
            doctor=doctor_profile,
            record_type='prescription',
            record_date=timezone.now().date(),
            diagnosis="Prescription Order",
            notes=f"Prescription for {serializer.validated_data.get('medication_name')}"
        )
        
        serializer.save(medical_record=record)

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'doctor_profile'):
             return self.queryset.filter(doctor=user.doctor_profile) # This needs update since Doctor is on MedicalRecord
        elif hasattr(user, 'patient_profile'):
             return self.queryset.filter(medical_record__patient=user.patient_profile)
        return self.queryset

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        prescription = self.get_object()
        
        # Verify user is a doctor
        if not hasattr(request.user, 'doctor_profile') and request.user.role != 'doctor':
             return Response({"error": "Only doctors can sign prescriptions."}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            prescription.sign(request.user)
            return Response({
                "status": "signed", 
                "message": "Prescription digitally signed and locked.",
                "signature_hash": prescription.signature_hash,
                "signed_at": prescription.signed_at
            })
        except ValueError as e:
             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class VitalSignViewSet(viewsets.ModelViewSet):
    from .models import VitalSign
    from .serializers import VitalSignSerializer
    
    queryset = VitalSign.objects.all()
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return self.queryset.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
             # Doctors can see vitals of their patients (simplified logic for now)
             return self.queryset
        return self.queryset.none()

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'patient_profile'):
             serializer.save(patient=self.request.user.patient_profile)
        else:
             # Handle staff creating vitals
             pass


@action(detail=False, methods=['get'])
@api_view(['GET'])
@permission_classes([IsPatient])
def patient_dashboard_stats(request):
    """
    Aggregate data for the patient dashboard.
    """
    user = request.user
    if not hasattr(user, 'patient_profile'):
        return Response({"error": "Patient profile not found"}, status=404)
    
    patient = user.patient_profile
    
    from .models import VitalSign, Prescription
    from .serializers import VitalSignSerializer

    # 1. Vitals History (Last 7 entries for Sparklines)
    vitals_history_qs = VitalSign.objects.filter(patient=patient).order_by('-recorded_at')[:7]
    vitals_history = VitalSignSerializer(vitals_history_qs, many=True).data
    # Reverse to chronological order for charts
    vitals_history.reverse()
    
    latest_vitals = vitals_history_qs.first() if vitals_history_qs else None
    vitals_data = VitalSignSerializer(latest_vitals).data if latest_vitals else None
        
    # 2. Health Score Calculation (Simplified Clinical Logic)
    health_score = 100
    if latest_vitals:
        # Blood Pressure Deduction
        # Normal: <120/<80
        if latest_vitals.systolic_bp > 120:
             deduction = (latest_vitals.systolic_bp - 120) * 0.5
             health_score -= deduction
        if latest_vitals.diastolic_bp > 80:
             deduction = (latest_vitals.diastolic_bp - 80) * 0.5
             health_score -= deduction
             
        # Heart Rate Deduction
        # Normal: 60-100
        if latest_vitals.heart_rate < 60:
             health_score -= (60 - latest_vitals.heart_rate)
        elif latest_vitals.heart_rate > 100:
             health_score -= (latest_vitals.heart_rate - 100) * 0.5
             
        # BMI Deduction (Weight / Height^2) - Height is missing in VitalSign, using weight > 100kg as arbitrary proxy for now
        if latest_vitals.weight > 100:
             health_score -= 5
             
        # Cap score 0-100
        health_score = max(0, min(100, int(health_score)))
    else:
        health_score = 0 # No data
    
    # 3. Active Prescriptions
    active_prescriptions_count = Prescription.objects.filter(
        medical_record__patient=patient, 
        status__in=['signed', 'dispensed']
    ).count()

    return Response({
        "health_score": health_score,
        "vitals": vitals_data,
        "vitals_history": vitals_history,
        "active_prescriptions": active_prescriptions_count,
        "patient_name": f"{user.first_name} {user.last_name}"
    })
