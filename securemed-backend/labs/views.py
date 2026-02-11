from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import LabTest, LabOrder, LabResult, LabResultNotification
from .serializers import LabTestSerializer, LabOrderSerializer, LabResultSerializer, LabResultNotificationSerializer


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
        if hasattr(user, 'patient_profile'):
            return LabOrder.objects.filter(patient=user)
        elif hasattr(user, 'doctor_profile') or user.role == 'doctor':
             return LabOrder.objects.all()
        elif user.is_staff:
            return LabOrder.objects.all()
        return LabOrder.objects.none()

    def perform_create(self, serializer):
        patient_id = self.request.data.get('patient_id')
        items = self.request.data.get('items', [])
        
        if not patient_id:
            raise serializers.ValidationError({"patient_id": "This field is required"})
        
        if not items:
            raise serializers.ValidationError({"items": "At least one test is required"})
        
        from django.contrib.auth import get_user_model
        from patients.models import Patient
        from labs.models import LabTest
        import uuid
        
        try:
            # Look up the Patient model first
            patient_model = Patient.objects.get(id=patient_id)
            patient_user = patient_model.user
        except Patient.DoesNotExist:
            raise serializers.ValidationError({"patient_id": "Invalid patient ID"})
        
        # Create the order
        order = serializer.save(
            doctor=self.request.user,
            patient=patient_user,
            sample_id=f"SMPL-{uuid.uuid4().hex[:8].upper()}"
        )
        
        # Add items
        order.items.set(items)

    @action(detail=True, methods=['post'])
    def mark_collected(self, request, pk=None):
        """Mark sample as collected."""
        order = self.get_object()
        if not request.user.is_staff and request.user.role != 'doctor':
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        order.status = 'collected'
        order.save(update_fields=['status'])
        return Response({"status": "collected"})


class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from django.core.files.base import ContentFile
        from django.utils import timezone
        import uuid
        from .crypto import encrypt_bytes

        file_obj = serializer.validated_data.get('file_attachment')
        if file_obj:
            encrypted = encrypt_bytes(file_obj.read())
            encrypted_file = ContentFile(encrypted, name=f"lab_{uuid.uuid4().hex}.enc")
            serializer.save(
                file_attachment=encrypted_file,
                file_attachment_name=file_obj.name,
                file_attachment_content_type=getattr(file_obj, 'content_type', '')
            )
        else:
            serializer.save()

    def perform_update(self, serializer):
        from django.core.files.base import ContentFile
        import uuid
        from .crypto import encrypt_bytes

        file_obj = serializer.validated_data.get('file_attachment')
        if file_obj:
            encrypted = encrypt_bytes(file_obj.read())
            encrypted_file = ContentFile(encrypted, name=f"lab_{uuid.uuid4().hex}.enc")
            serializer.save(
                file_attachment=encrypted_file,
                file_attachment_name=file_obj.name,
                file_attachment_content_type=getattr(file_obj, 'content_type', '')
            )
        else:
            serializer.save()
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        result = self.get_object()
        if not result.file_attachment:
            return Response({"error": "No file attached."}, status=status.HTTP_404_NOT_FOUND)
            
        from django.http import FileResponse
        from io import BytesIO
        from .crypto import decrypt_bytes
        encrypted_payload = result.file_attachment.read()
        decrypted = decrypt_bytes(encrypted_payload)
        response = FileResponse(BytesIO(decrypted))
        filename = result.file_attachment_name or result.file_attachment.name
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release a lab result to the patient portal."""
        result = self.get_object()
        if not hasattr(request.user, 'doctor_profile') and not request.user.is_staff:
            return Response({"error": "Only doctors can release results."}, status=status.HTTP_403_FORBIDDEN)

        result.released_to_patient = True
        result.released_at = timezone.now()
        result.save(update_fields=['released_to_patient', 'released_at'])
        
        # Mark order as completed if all results are released
        order = result.order
        all_results_released = all(r.released_to_patient for r in order.results.all())
        if all_results_released and order.status != 'completed':
            order.status = 'completed'
            order.save(update_fields=['status'])
            
            # Create invoice for lab tests
            from medical_records.billing_service import create_lab_test_invoice
            try:
                invoice = create_lab_test_invoice(order)
                if invoice:
                    return Response({
                        "status": "released",
                        "released_at": result.released_at,
                        "order_completed": True,
                        "invoice_id": invoice.invoice_id,
                        "invoice_created": True
                    })
            except Exception as e:
                import logging
                logging.error(f"Failed to create lab invoice: {e}")
        
        return Response({"status": "released", "released_at": result.released_at})

    @action(detail=True, methods=['get'])
    def presigned(self, request, pk=None):
        """Generate a temporary signed URL for secure viewing."""
        from django.urls import reverse
        from django.core.signing import TimestampSigner
        signer = TimestampSigner()
        token = signer.sign(f"{pk}:{request.user.id}")
        path = reverse('lab-results-secure-view', kwargs={'pk': pk})
        return Response({
            "url": f"{path}?token={token}",
            "expires_in_seconds": 300
        })

    @action(detail=True, methods=['get'], url_path='secure-view', url_name='secure-view')
    def secure_view(self, request, pk=None):
        """Serve decrypted file if token is valid and user has access."""
        from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
        from django.http import FileResponse
        from io import BytesIO
        from .crypto import decrypt_bytes

        token = request.query_params.get('token')
        if not token:
            return Response({"error": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        signer = TimestampSigner()
        try:
            value = signer.unsign(token, max_age=300)
        except SignatureExpired:
            return Response({"error": "Token expired"}, status=status.HTTP_401_UNAUTHORIZED)
        except BadSignature:
            return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)

        token_result_id, token_user_id = value.split(':', 1)
        if str(pk) != token_result_id or str(request.user.id) != token_user_id:
            return Response({"error": "Token mismatch"}, status=status.HTTP_401_UNAUTHORIZED)

        result = self.get_object()
        if hasattr(request.user, 'patient_profile'):
            if result.order.patient_id != request.user.id or not result.released_to_patient:
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        elif hasattr(request.user, 'doctor_profile') or request.user.is_staff:
            if result.order.doctor_id not in [None, request.user.id] and not request.user.is_staff:
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        if not result.file_attachment:
            return Response({"error": "No file attached."}, status=status.HTTP_404_NOT_FOUND)

        decrypted = decrypt_bytes(result.file_attachment.read())
        response = FileResponse(BytesIO(decrypted))
        filename = result.file_attachment_name or result.file_attachment.name
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class LabWorklistViewSet(viewsets.ViewSet):
    """
    Story 4.2: Blinded Processing
    Lab Worklist for technicians - shows only Sample IDs (no patient names)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get blinded worklist for technicians"""
        
        # RESTRICT: Only staff/technicians can view worklist
        if not request.user.is_staff and request.user.role not in ['lab_technician', 'doctor', 'nurse']:
             return Response({"error": "Unauthorized. Only clinical staff can view the lab worklist."}, status=status.HTTP_403_FORBIDDEN)

        # Filter by pending/processing orders
        orders = LabOrder.objects.filter(
            status__in=['pending', 'ordered', 'collected', 'processing']
        ).prefetch_related('items', 'results').order_by('priority', 'created_at')
        
        worklist = []
        for order in orders:
            # Generate sample ID (blinded identifier)
            sample_id = order.sample_id or f"SAMPLE-{order.id:06d}"
            
            # Get tests that haven't been processed yet
            completed_test_ids = order.results.values_list('test_id', flat=True)
            pending_tests = order.items.exclude(id__in=completed_test_ids)
            
            for test in pending_tests:
                worklist.append({
                    'id': order.id,
                    'sample_id': sample_id,
                    'test_code': test.code,
                    'test_name': test.name,
                    'category': test.category,
                    'priority': order.priority,
                    'priority_display': order.get_priority_display(),
                    'fasting_required': order.fasting_required,
                    'ordered_at': order.created_at,
                    'status': order.status,
                })
        
        return Response(worklist)
    
    @action(detail=True, methods=['post'])
    def enter_result(self, request, pk=None):
        """Enter result for a specific order/test (blinded)"""
        try:
            order = LabOrder.objects.get(id=pk)
        except LabOrder.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        
        test_code = request.data.get('test_code')
        result_value = request.data.get('result_value')
        units = request.data.get('units', '')
        reference_range = request.data.get('reference_range', '')
        flag = request.data.get('flag', '')  # High, Low, Critical
        notes = request.data.get('notes', '')
        
        if not test_code or not result_value:
            return Response({"error": "test_code and result_value are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate result value (basic range check)
        try:
            numeric_value = float(result_value)
            if reference_range:
                # Parse reference range like "4.0-10.0"
                parts = reference_range.replace(' ', '').split('-')
                if len(parts) == 2:
                    low, high = float(parts[0]), float(parts[1])
                    if numeric_value < low:
                        flag = flag or 'Low'
                    elif numeric_value > high:
                        flag = flag or 'High'
        except (ValueError, IndexError):
            pass  # Non-numeric results are valid (e.g., "Positive", "Negative")
        
        # Get the test
        try:
            test = LabTest.objects.get(code=test_code)
        except LabTest.DoesNotExist:
            return Response({"error": "Test not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create or update result
        result, created = LabResult.objects.update_or_create(
            order=order,
            test=test,
            defaults={
                'result_value': result_value,
                'units': units,
                'reference_range': reference_range,
                'flag': flag,
                'notes': notes,
                'technician_name': request.user.get_full_name() or request.user.email,
                'technician': request.user,
            }
        )
        
        # Update order status if all tests are completed
        pending_tests = order.items.exclude(id__in=order.results.values_list('test_id', flat=True))
        if not pending_tests.exists():
            order.status = 'completed'
            order.save()

            # Send standard completion notification
            from core.notifications import NotificationService
            NotificationService.send_lab_result_notification(result)
            if order.doctor:
                LabResultNotification.objects.create(
                    user=order.doctor,
                    lab_result=result,
                    message=f"Lab result finalized for {result.test.name} (Order #{order.id})."
                )
        elif order.status in ['pending', 'ordered', 'collected']:
            order.status = 'processing'
            order.save()
        
        # If this specific result is critical, ensure alert is sent immediately
        # regardless of order completion status
        if flag == 'Critical':
            from core.notifications import NotificationService
            NotificationService.send_critical_lab_alert(result)
            if order.doctor:
                LabResultNotification.objects.create(
                    user=order.doctor,
                    lab_result=result,
                    message=f"CRITICAL lab result for {result.test.name} (Order #{order.id})."
                )
        
        return Response({
            'success': True,
            'result_id': result.id,
            'is_critical': flag == 'Critical',
            'order_status': order.status,
        })
    
    @action(detail=True, methods=['post'])
    def flag_critical(self, request, pk=None):
        """Flag a result as critical value for immediate alert"""
        try:
            result = LabResult.objects.get(id=pk)
        except LabResult.DoesNotExist:
            return Response({"error": "Result not found"}, status=status.HTTP_404_NOT_FOUND)
        
        result.flag = 'Critical'
        result.notes = f"{result.notes}\n[CRITICAL VALUE FLAGGED at {timezone.now()}]"
        result.save()
        
        # Story 4.3: Immediate Alert for Critical Values
        from core.notifications import NotificationService
        NotificationService.send_critical_lab_alert(result)
        if result.order and result.order.doctor:
            LabResultNotification.objects.create(
                user=result.order.doctor,
                lab_result=result,
                message=f"CRITICAL lab result for {result.test.name} (Order #{result.order.id})."
            )
        
        return Response({
            'success': True,
            'message': 'Result flagged as critical. Alert sent to ordering physician.',
        })


class LabNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LabResultNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LabResultNotification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({"status": "read"})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        LabResultNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "all_read"})
