from django.shortcuts import render
from rest_framework import viewsets, permissions
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
