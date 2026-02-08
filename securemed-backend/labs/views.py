from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import LabTest, LabOrder, LabResult
from .serializers import LabTestSerializer, LabOrderSerializer, LabResultSerializer

class LabTestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catalog of available lab tests.
    """
    queryset = LabTest.objects.filter(is_active=True)
    serializer_class = LabTestSerializer
    permission_classes = [permissions.IsAuthenticated]

class LabOrderViewSet(viewsets.ModelViewSet):
    """
    Manage lab orders.
    """
    serializer_class = LabOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Patient sees their own orders
        if hasattr(user, 'patient_profile'): # Or check role
            return LabOrder.objects.filter(patient=user)
        # Doctor sees orders they created or relevant to their patients (simplified for now)
        elif hasattr(user, 'doctor_profile') or user.role == 'doctor':
             return LabOrder.objects.all() # In production, filter by doctor's patients
        elif user.is_staff:
            return LabOrder.objects.all()
        return LabOrder.objects.none()

    def perform_create(self, serializer):
        # Auto-assign patient from request data if doctor is ordering, or current user if patient
        # Ideally, a doctor orders for a patient.
        
        patient_id = self.request.data.get('patient_id')
        
        if self.request.user.role == 'doctor':
             # Doctor ordering for a patient
             # Validate patient_id exists... (omitted for brevity, relying on serializer/db constraints if setup)
             # We need to manually set the patient field from the ID
             from django.contrib.auth import get_user_model
             User = get_user_model()
             try:
                 patient = User.objects.get(id=patient_id)
                 serializer.save(doctor=self.request.user, patient=patient)
             except User.DoesNotExist:
                 raise serializers.ValidationError({"patient_id": "Invalid patient ID"})
                 
        elif self.request.user.role == 'patient':
            # Self-order (if allowed?) or mostly view
             serializer.save(patient=self.request.user)
        else:
             serializer.save(doctor=self.request.user) # Fallback

class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # Add robust permissions here (technicians write, doctors/patients read)
