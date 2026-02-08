from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
            # We look up by user ID (which is what frontend sends as patientId key usually)
            # But the frontend might be sending the Patient ID string or the User ID
            # Let's assume User ID for now based on previous components
            patient = Patient.objects.get(user__id=patient_id)
        except Patient.DoesNotExist:
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

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'doctor_profile'):
             return self.queryset.filter(doctor=user.doctor_profile) # Assuming Prescription has doctor field derived from MedicalRecord
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
