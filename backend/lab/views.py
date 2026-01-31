from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.base import ContentFile
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from .models import LabOrder, LabResult, TestPanel, Patient
from .serializers import (
    LabOrderSerializer, 
    BlindedWorklistSerializer, 
    LabResultSerializer,
    TestPanelSerializer,
    PatientSerializer
)
from .encryption import encrypt_file, decrypt_file_content
from .permissions import IsLabTechnician, IsDoctor

def validate_file_header(file_obj):
    """
    Validates file integrity by checking magic numbers (file signatures).
    Allowed: PDF, JPEG, PNG, DICOM.
    """
    file_obj.seek(0)
    header = file_obj.read(132) # Read enough for DICOM (128 preamble + 4 chars)
    file_obj.seek(0) # Reset
    
    # Magic numbers
    if header.startswith(b'%PDF'):
        return True
    if header.startswith(b'\xff\xd8\xff'): # JPEG
        return True
    if header.startswith(b'\x89PNG\r\n\x1a\n'): # PNG
        return True
    
    # DICOM: 128 bytes preamble + "DICM"
    if len(header) >= 132 and header[128:132] == b'DICM':
        return True
        
    return False

class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.all()
    serializer_class = LabOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # If doctor, show their orders
        # If staff/admin, show all
        if user.is_staff:
            return LabOrder.objects.all()
        # For demo, assuming user is linked to a Doctor profile
        if hasattr(user, 'doctor'):
            return LabOrder.objects.filter(ordering_doctor=user.doctor)
        return LabOrder.objects.none()

    def perform_create(self, serializer):
        # Auto-assign ordering doctor if exists
        doctor = getattr(self.request.user, 'doctor', None)
        serializer.save(ordering_doctor=doctor)

class BlindedWorklistViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View for Lab Technicians.
    Shows only Sample IDs and Tests. No Patient Names.
    """
    queryset = LabOrder.objects.exclude(status='COMPLETED')
    serializer_class = BlindedWorklistSerializer
    # Only Lab Technicians can view the worklist
    permission_classes = [permissions.IsAuthenticated, IsLabTechnician]

class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file_upload')
        
        # 1. Malware/Safety Scan (File Type Validation)
        if file_obj and not validate_file_header(file_obj):
             raise serializers.ValidationError("Invalid file type. Only PDF, JPEG, PNG, or DICOM allowed.")

        # 2. Encrypt File
        if file_obj:
            # Calculate SHA-256 Hash of original file for integrity
            import hashlib
            sha256_hash = hashlib.sha256()
            for chunk in file_obj.chunks():
                sha256_hash.update(chunk)
            file_hash = sha256_hash.hexdigest()
            
            # Reset pointer to beginning for encryption
            file_obj.seek(0)
            
            encrypted_data = encrypt_file(file_obj)
            # Create a new ContentFile with encrypted data
            # Keep original extension or change to .enc? Keeping original for metadata
            encrypted_file = ContentFile(encrypted_data, name=file_obj.name)
            
            serializer.save(
                technician=self.request.user,
                file_upload=encrypted_file,
                file_hash=file_hash
            )
        else:
            serializer.save(technician=self.request.user)
        
        # 3. Update Order Status
        instance = serializer.instance
        if instance and instance.order:
            instance.order.status = LabOrder.Status.PROCESSING
            instance.order.save()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Securely retrieve and decrypt the result file.
        In prod, this would generate a pre-signed URL from S3.
        Here we decrypt on the fly and serve.
        """
        result = self.get_object()
        if not result.file_upload:
            return Response({"error": "No file attached"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Read encrypted file from storage
            with result.file_upload.open('rb') as f:
                encrypted_content = f.read()
            
            decrypted_content = decrypt_file_content(encrypted_content)
            
            # Serve file
            response = HttpResponse(decrypted_content, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{result.file_upload.name}"'
            return response
        except Exception as e:
            return Response({"error": "Decryption failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestPanelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TestPanel.objects.all()
    serializer_class = TestPanelSerializer

class PatientViewSet(viewsets.ReadOnlyModelViewSet):
    from .models import Patient
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer # Imported below or need to ensure import

