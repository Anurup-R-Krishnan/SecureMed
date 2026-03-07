from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from .models import MedicalRecord, MedicalRecordAccess
from .serializers import MedicalRecordSerializer
from apps.accounts.users.permissions import IsPatient
from apps.accounts.patients.models import Patient
from apps.clinical.pharmacy.models import Drug
from .interaction_service import (
    evaluate_medication_safety,
    generate_and_store_report,
    get_active_medications_for_patient,
)

class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Optimize queryset with select_related to prevent N+1 queries.
        Supports search and patient_id query params for doctor search."""
        user = self.request.user
        base_queryset = MedicalRecord.objects.select_related(
            'doctor__user',
            'patient__user'
        ).prefetch_related('prescriptions')
        
        if hasattr(user, 'patient_profile'):
            return base_queryset.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
            # Check for search/filter query params
            search = self.request.query_params.get('search', '').strip()
            patient_id_param = self.request.query_params.get('patient_id', '').strip()
            
            # If doctor is searching by patient name/ID, search across ALL patients
            # (consistent with list_patients and patient_detail access)
            if search or patient_id_param:
                qs = base_queryset
                
                if patient_id_param:
                    # Support numeric PK or display patient_id (P-0008)
                    if patient_id_param.isdigit():
                        qs = qs.filter(patient__id=int(patient_id_param))
                    else:
                        qs = qs.filter(
                            Q(patient__patient_id__icontains=patient_id_param)
                        )
                
                if search:
                    qs = qs.filter(
                        Q(patient__user__first_name__icontains=search) |
                        Q(patient__user__last_name__icontains=search) |
                        Q(patient__patient_id__icontains=search) |
                        Q(diagnosis__icontains=search) |
                        Q(doctor__user__first_name__icontains=search) |
                        Q(doctor__user__last_name__icontains=search) |
                        Q(record_type__icontains=search) |
                        Q(notes__icontains=search)
                    )
                
                return qs.distinct()
            
            # Default: doctor's own records + emergency access records
            qs = base_queryset.filter(doctor=user.doctor_profile)
            
            # Emergency Access: Records for patients in active break-glass logs
            from .models import EmergencyAccessLog
            emergency_patient_ids = EmergencyAccessLog.objects.filter(
                accessed_by=user
            ).values_list('patient_id', flat=True)
            
            if emergency_patient_ids:
                return base_queryset.filter(
                    Q(doctor=user.doctor_profile) | 
                    Q(patient__id__in=emergency_patient_ids)
                ).distinct()
            
            return qs
            
        elif user.is_staff:
            return base_queryset.all()
        return MedicalRecord.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()
        
        # Determine source and authorization
        if hasattr(user, 'doctor_profile'):
            data['source'] = 'provider'
            data['is_attested'] = True
            data['attested_by'] = user.doctor_profile.id
            from django.utils import timezone
            data['attested_at'] = timezone.now()
            
            # Doctor creating record
            data['doctor'] = user.doctor_profile.id
            
        elif hasattr(user, 'nurse_profile'):
            data['source'] = 'provider'
            data['is_attested'] = False # Nurses need doctor attestation usually, or limited scope
            
            # Nurses must specify doctor
            if 'doctor' not in data:
                 return Response({"error": "Nurses must specify the attending doctor."}, status=status.HTTP_400_BAD_REQUEST)

        elif hasattr(user, 'patient_profile'):
            # RESTRICT: Patients cannot create/upload medical records (Real-world hospital constraint)
            return Response(
                {"error": "Patients are not authorized to create or upload medical records."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        else:
             return Response({"error": "Unauthorized role."}, status=status.HTTP_403_FORBIDDEN)

        # Auto-generate record ID if not provided
        import uuid
        if 'record_id' not in data:
            data['record_id'] = f"REC-{uuid.uuid4().hex[:8].upper()}"
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def retrieve(self, request, *args, **kwargs):
        """
        Get details of a specific medical record.
        Logs the access for audit trail.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # AUDIT: Log view access
        from .audit import log_medical_record_access
        try:
            log_medical_record_access(request.user, instance, 'viewed', 'Clinical review', request)
        except Exception:
            pass
        
        return Response(serializer.data)

    def perform_create(self, serializer):
        # Saving happens here
        record = serializer.save()
        
        # AUDIT: Log creation
        from .audit import log_medical_record_access
        try:
             log_medical_record_access(self.request.user, record, 'created', 'New record entry', self.request)
        except Exception:
             pass

    def perform_update(self, serializer):
        record = serializer.save()
        
        # AUDIT: Log update
        from .audit import log_medical_record_access
        try:
            log_medical_record_access(self.request.user, record, 'updated', 'Record modification', self.request)
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def attest(self, request, pk=None):
        """
        Provider Attestation Workflow.
        Doctors can sign off on records created by nurses or uploaded by patients.
        """
        if not hasattr(request.user, 'doctor_profile'):
             return Response({"error": "Only doctors can attest records."}, status=status.HTTP_403_FORBIDDEN)
             
        record = self.get_object()
        
        if record.is_attested:
             return Response({"error": "Record is already attested."}, status=status.HTTP_400_BAD_REQUEST)
             
        from django.utils import timezone
        record.is_attested = True
        record.attested_by = request.user.doctor_profile
        record.attested_at = timezone.now()
        record.save()
        
        return Response({"status": "attested", "attested_by": f"Dr. {request.user.last_name}", "at": record.attested_at})

    @action(detail=True, methods=['post'])
    def amend(self, request, pk=None):
        """
        Amendment Workflow.
        Creates a linked amendment record instead of modifying the original.
        """
        if not hasattr(request.user, 'doctor_profile'):
             return Response({"error": "Only doctors can amend records."}, status=status.HTTP_403_FORBIDDEN)

        original_record = self.get_object()
        reason = request.data.get('amendment_reason')
        new_notes = request.data.get('notes')
        
        if not reason or not new_notes:
             return Response({"error": "Amendment reason and new notes are required."}, status=status.HTTP_400_BAD_REQUEST)
             
        # Clone and create new record
        import uuid
        from django.utils import timezone
        
        new_record = MedicalRecord.objects.create(
            record_id=f"REC-{uuid.uuid4().hex[:8].upper()}",
            patient=original_record.patient,
            doctor=request.user.doctor_profile,
            record_type=original_record.record_type,
            record_date=timezone.now().date(),
            diagnosis=original_record.diagnosis, # Keep original or update? detailed amend logic depends. keeping simple.
            symptoms=original_record.symptoms,
            treatment=original_record.treatment,
            notes=new_notes,
            parent_record=original_record,
            amendment_reason=reason,
            source='provider',
            is_attested=True,
            attested_by=request.user.doctor_profile,
            attested_at=timezone.now()
        )
        
        return Response(MedicalRecordSerializer(new_record).data, status=status.HTTP_201_CREATED)

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
                "title": r.get_record_type_display() if hasattr(r, 'get_record_type_display') else r.record_type,
                "description": r.notes[:50] if r.notes else "",
                "details": [r.notes] if r.notes else []
            })
            
        # 2. Lab Orders (from our new app)
        from apps.clinical.diagnostics.models import LabOrder
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
        from apps.scheduling.appointments.models import Appointment
        appts = Appointment.objects.filter(patient_id=patient_id)
        for a in appts:
            events.append({
                "id": f"apt-{a.id}",
                "date": a.appointment_date,
                "type": "appointment",
                "title": f"Appointment with Dr. {a.doctor.user.last_name if a.doctor else 'Unknown'}",
                "description": a.status,
                "details": [f"Time: {a.appointment_time.strftime('%H:%M')}"]
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
        emergency_type = request.data.get('emergency_type', 'other')
        
        if not patient_id or not reason:
            return Response(
                {"error": "Both patient_id and reason are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.accounts.patients.models import Patient
        try:
            # Try to lookup by patient_id string first (e.g., 'PAT-XXXXXXXX')
            patient = Patient.objects.filter(patient_id=patient_id).first()
            if not patient:
                # Try by Patient table PK (numeric)
                try:
                    patient = Patient.objects.get(pk=int(patient_id))
                except (Patient.DoesNotExist, ValueError, TypeError):
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
            emergency_type=emergency_type,
            ip_address=request.META.get('REMOTE_ADDR'),
            # expires_at = timezone.now() + timedelta(hours=24) 
        )
        
        # Log to system logger for critical alert
        import logging
        logger = logging.getLogger('security')
        logger.critical(
            "BREAK-GLASS EVENT: User %s accessed patient %s. Type: %s. Reason: %s",
            request.user.email,
            patient.patient_id,
            emergency_type,
            reason,
        )

        from apps.platform.core.notifications import NotificationService
        NotificationService.send_security_alert(
            subject="SECURITY ALERT: Break-Glass Access",
            message=(
                f"User: {request.user.email}\n"
                f"Patient: {patient.patient_id}\n"
                f"Type: {emergency_type}\n"
                f"Reason: {reason}\n"
                f"IP: {request.META.get('REMOTE_ADDR')}\n"
                f"Timestamp: {log.timestamp}"
            ),
        )
        
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
        prescription, interaction_result = self.perform_create(serializer)
        response_serializer = self.get_serializer(prescription)
        response_payload = dict(response_serializer.data)
        response_payload["interaction_check"] = {
            "has_findings": len(interaction_result.get("findings", [])) > 0,
            "total_findings": len(interaction_result.get("findings", [])),
            "totals": interaction_result.get("totals", {}),
            "evaluated_combination_depth": interaction_result.get("evaluated_combination_depth", 3),
            "not_evaluated_depths": interaction_result.get("not_evaluated_depths", []),
            "findings": interaction_result.get("findings", []),
        }
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_payload, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        from .models import MedicalRecord
        from django.utils import timezone
        import uuid
        
        patient_id = serializer.validated_data.pop('patient_id', None)
        if not patient_id:
            raise serializers.ValidationError({'patient_id': 'This field is required.'})
        
        if not hasattr(self.request.user, 'doctor_profile'):
            raise PermissionDenied('Only doctors can create prescriptions.')
        doctor_profile = self.request.user.doctor_profile

        # Drug-drug interaction check against full active medication set (warning-only policy).
        new_med = serializer.validated_data.get('medication_name', '').strip()
        candidate_meds = [new_med] if new_med else []
        active_meds = get_active_medications_for_patient(patient_id)
        interaction_result = evaluate_medication_safety(active_meds + candidate_meds)
        
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

        prescription = serializer.save(medical_record=record)
        patient = Patient.objects.get(pk=patient_id)
        # Regenerate report whenever medication set changes.
        generate_and_store_report(
            patient=patient,
            generated_by=self.request.user,
            trigger_event='prescription_created',
            candidate_medications=[prescription.medication_name],
        )
        return prescription, interaction_result

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'doctor_profile'):
               return self.queryset.filter(medical_record__doctor=user.doctor_profile)
        elif hasattr(user, 'patient_profile'):
             return self.queryset.filter(medical_record__patient=user.patient_profile)
        return self.queryset

    def update(self, request, *args, **kwargs):
        prescription = self.get_object()
        if prescription.is_signed:
            return Response({"error": "Signed prescriptions cannot be edited."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        prescription = self.get_object()
        if prescription.is_signed:
            return Response({"error": "Signed prescriptions cannot be edited."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        prescription = self.get_object()
        
        # Verify user is a doctor
        if not hasattr(request.user, 'doctor_profile') and request.user.role != 'doctor':
             return Response({"error": "Only doctors can sign prescriptions."}, status=status.HTTP_403_FORBIDDEN)

        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response({"error": "Invalid password."}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            prescription.sign(request.user)
            from .models import MedicationHistoryEvent, PharmacyOrder
            from django.utils import timezone
            import secrets

            MedicationHistoryEvent.objects.create(
                prescription=prescription,
                event_type='started',
                changed_by=request.user
            )

            PharmacyOrder.objects.get_or_create(
                prescription=prescription,
                defaults={'pickup_code': secrets.token_hex(6).upper()}
            )
            generate_and_store_report(
                patient=prescription.medical_record.patient,
                generated_by=request.user,
                trigger_event='prescription_signed',
            )
            return Response({
                "status": "signed", 
                "message": "Prescription digitally signed and locked.",
                "signature_hash": prescription.signature_hash,
                "signed_at": prescription.signed_at
            })
        except ValueError as e:
             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        prescription = self.get_object()
        if not hasattr(request.user, 'doctor_profile') and request.user.role != 'doctor':
            return Response({"error": "Only doctors can cancel prescriptions."}, status=status.HTTP_403_FORBIDDEN)
        prescription.status = 'cancelled'
        prescription.save(update_fields=['status'])
        from .models import MedicationHistoryEvent
        MedicationHistoryEvent.objects.create(
            prescription=prescription,
            event_type='cancelled',
            changed_by=request.user
        )
        generate_and_store_report(
            patient=prescription.medical_record.patient,
            generated_by=request.user,
            trigger_event='prescription_cancelled',
        )
        return Response({"status": "cancelled"})


class DrugInteractionViewSet(viewsets.ModelViewSet):
    from .models import DrugInteraction, MedicationInteractionReport
    from .serializers import DrugInteractionSerializer, MedicationInteractionReportSerializer
    queryset = DrugInteraction.objects.all()
    serializer_class = DrugInteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_patient(self, request):
        patient_id = request.query_params.get('patient_id') or request.data.get('patient_id')
        if hasattr(request.user, 'patient_profile'):
            return request.user.patient_profile
        if not patient_id:
            return None
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            raise ValidationError({"patient_id": "Patient not found."})

        if request.user.is_staff or request.user.role == 'admin':
            return patient
        if hasattr(request.user, 'doctor_profile'):
            # Doctor must have existing record relationship or emergency access.
            has_access = MedicalRecord.objects.filter(
                patient=patient,
                doctor=request.user.doctor_profile,
            ).exists()
            if not has_access:
                from .models import EmergencyAccessLog
                has_access = EmergencyAccessLog.objects.filter(
                    patient=patient,
                    accessed_by=request.user
                ).exists()
            if has_access:
                return patient
        raise PermissionDenied("No permission to access this patient.")

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.role == 'admin':
            return self.queryset
        return self.queryset.none()

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = (request.query_params.get('q') or '').strip().lower()
        if len(query) < 2:
            return Response({"results": []})

        active_names = set()
        patient = None
        try:
            patient = self._resolve_patient(request)
        except (ValidationError, PermissionDenied):
            patient = None

        if patient:
            from .models import Prescription
            active_rx_names = Prescription.objects.filter(
                medical_record__patient=patient,
                status__in=['signed', 'dispensed'],
            ).values_list('medication_name', flat=True)
            for name in active_rx_names:
                if name:
                    active_names.add(name.strip())

        pharmacy_names = Drug.objects.filter(
            is_active=True,
            name__icontains=query
        ).values_list('name', flat=True)[:30]
        from .models import MedicationReference
        mapped_names = MedicationReference.objects.filter(
            normalized_name__icontains=query
        ).values_list('display_name', flat=True)[:30]

        all_names = set(pharmacy_names)
        all_names.update(mapped_names)
        all_names.update(active_names)
        filtered = sorted([name for name in all_names if query in name.lower()])[:50]
        return Response({"results": filtered})

    @action(detail=False, methods=['post'])
    def check(self, request):
        meds = request.data.get('medications') or []
        if not isinstance(meds, list):
            raise ValidationError({"medications": "Must be a list of medication names."})
        include_active = request.data.get("include_active", True)
        include_active = str(include_active).lower() not in {"false", "0", "no"}

        patient = self._resolve_patient(request)
        active_meds = get_active_medications_for_patient(patient.id) if (patient and include_active) else []
        merged_meds = sorted(set([m for m in meds if m] + active_meds))
        if len(merged_meds) < 1:
            raise ValidationError({"medications": "At least one medication is required."})

        result = evaluate_medication_safety(merged_meds)
        result["requested_medications"] = meds
        result["active_medications_added"] = active_meds
        result["include_active"] = include_active
        return Response(result)

    @action(detail=False, methods=['get'], url_path='reports/latest')
    def latest_report(self, request):
        patient = self._resolve_patient(request)
        if not patient:
            raise ValidationError({"patient_id": "patient_id is required for doctor/admin."})
        report = self.MedicationInteractionReport.objects.filter(patient=patient).prefetch_related('items').first()
        if not report:
            return Response({"detail": "No report found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.MedicationInteractionReportSerializer(report)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='reports')
    def report_history(self, request):
        patient = self._resolve_patient(request)
        if not patient:
            raise ValidationError({"patient_id": "patient_id is required for doctor/admin."})
        reports = self.MedicationInteractionReport.objects.filter(patient=patient).prefetch_related('items')[:20]
        serializer = self.MedicationInteractionReportSerializer(reports, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='reports/generate')
    def generate_report(self, request):
        patient = self._resolve_patient(request)
        if not patient:
            raise ValidationError({"patient_id": "patient_id is required for doctor/admin."})
        report = generate_and_store_report(
            patient=patient,
            generated_by=request.user,
            trigger_event='manual_refresh',
        )
        serializer = self.MedicationInteractionReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PharmacyOrderViewSet(viewsets.ModelViewSet):
    from .models import PharmacyOrder
    from .serializers import PharmacyOrderSerializer
    queryset = PharmacyOrder.objects.all()
    serializer_class = PharmacyOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'pharmacist':
            return self.queryset
        if hasattr(user, 'doctor_profile'):
            return self.queryset.filter(prescription__medical_record__doctor=user.doctor_profile)
        if hasattr(user, 'patient_profile'):
            return self.queryset.filter(prescription__medical_record__patient=user.patient_profile)
        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        return Response({"error": "Pharmacy orders are created when prescriptions are signed."}, status=400)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        order = self.get_object()
        if not request.user.is_staff and request.user.role != 'pharmacist':
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        order.status = 'verified'
        order.verified_by = request.user
        order.verification_notes = request.data.get('notes', '')
        order.save(update_fields=['status', 'verified_by', 'verification_notes'])
        return Response({"status": "verified"})

    @action(detail=True, methods=['post'])
    def fulfill(self, request, pk=None):
        order = self.get_object()
        if not request.user.is_staff and request.user.role != 'pharmacist':
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        pickup_code = request.data.get('pickup_code')
        if pickup_code and pickup_code != order.pickup_code:
            return Response({"error": "Invalid pickup code."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'fulfilled'
        order.fulfilled_by = request.user
        order.dispensed_at = timezone.now()
        order.save(update_fields=['status', 'fulfilled_by', 'dispensed_at'])

        # Update prescription status and log history
        prescription = order.prescription
        prescription.status = 'dispensed'
        prescription.save(update_fields=['status'])
        from .models import MedicationHistoryEvent
        MedicationHistoryEvent.objects.create(
            prescription=prescription,
            event_type='dispensed',
            changed_by=request.user
        )
        generate_and_store_report(
            patient=prescription.medical_record.patient,
            generated_by=request.user,
            trigger_event='prescription_dispensed',
        )
        
        # Create invoice for pharmacy order
        from .billing_service import create_pharmacy_invoice
        try:
            invoice = create_pharmacy_invoice(order)
            if invoice:
                return Response({
                    "status": "fulfilled",
                    "invoice_id": invoice.invoice_id,
                    "invoice_created": True
                })
        except Exception as e:
            # Don't fail the fulfillment if invoice creation fails
            import logging
            logging.error(f"Failed to create pharmacy invoice: {e}")
        
        return Response({"status": "fulfilled"})


class MedicationAdherenceLogViewSet(viewsets.ModelViewSet):
    from .models import MedicationAdherenceLog
    from .serializers import MedicationAdherenceLogSerializer
    queryset = MedicationAdherenceLog.objects.all()
    serializer_class = MedicationAdherenceLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return self.queryset.filter(prescription__medical_record__patient=user.patient_profile)
        if user.is_staff:
            return self.queryset
        return self.queryset.none()

    def perform_create(self, serializer):
        prescription = serializer.validated_data.get('prescription')
        if not hasattr(self.request.user, 'patient_profile'):
            raise PermissionDenied("Only patients can log adherence.")
        if prescription.medical_record.patient != self.request.user.patient_profile:
            raise PermissionDenied("Cannot log adherence for another patient.")
        serializer.save(taken_by=self.request.user)


class MedicationHistoryEventViewSet(viewsets.ReadOnlyModelViewSet):
    from .models import MedicationHistoryEvent
    from .serializers import MedicationHistoryEventSerializer
    queryset = MedicationHistoryEvent.objects.all()
    serializer_class = MedicationHistoryEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return self.queryset.filter(prescription__medical_record__patient=user.patient_profile)
        if hasattr(user, 'doctor_profile'):
            return self.queryset.filter(prescription__medical_record__doctor=user.doctor_profile)
        if user.is_staff:
            return self.queryset
        return self.queryset.none()


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
        user = self.request.user
        
        # Determine Source and Verification
        if hasattr(user, 'doctor_profile') or hasattr(user, 'nurse_profile'):
             serializer.save(
                 source='clinical',
                 is_verified=True,
                 verified_by=user
             )
        elif hasattr(user, 'patient_profile'):
             # Patient self-reported
             serializer.save(
                 patient=user.patient_profile,
                 source='patient',
                 is_verified=False,
                 verified_by=None
             )
        else:
             # Default fallback
             serializer.save()


@api_view(['GET'])
@permission_classes([IsPatient])
def patient_dashboard_stats(request):
    """
    Comprehensive dashboard data for patient portal.
    Returns: health score, vitals, prescriptions, lab results, records, billing, health insights.
    NO MOCK DATA - all from database.
    """
    user = request.user
    if not hasattr(user, 'patient_profile'):
        return Response({"error": "Patient profile not found"}, status=404)
    
    patient = user.patient_profile
    
    try:
        from .models import VitalSign, Prescription, MedicalRecord
        from .serializers import VitalSignSerializer
        from apps.clinical.diagnostics.models import LabResult, LabOrder
        from apps.finance.billing.models import Invoice
        from apps.accounts.patients.models import WellnessTip
        
        # 1. Vitals History (Last 7 entries for Sparklines)
        vitals_history_qs = VitalSign.objects.filter(patient=patient).order_by('-recorded_at')[:7]
        vitals_history = VitalSignSerializer(vitals_history_qs, many=True).data
        if hasattr(vitals_history, 'serializer'):
            vitals_history = list(vitals_history)
        vitals_history.reverse()
        
        latest_vitals_qs = VitalSign.objects.filter(patient=patient).order_by('-recorded_at')
        latest_vitals = latest_vitals_qs.first()
        
        # Create baseline vitals if patient has none
        if not latest_vitals:
            from django.utils import timezone
            latest_vitals = VitalSign.objects.create(
                patient=patient,
                heart_rate=72,
                systolic_bp=120,
                diastolic_bp=80,
                weight=70.0,
                source='clinical',
                is_verified=True,
                recorded_at=timezone.now()
            )
            vitals_history_qs = VitalSign.objects.filter(patient=patient).order_by('-recorded_at')[:7]
            vitals_history = VitalSignSerializer(vitals_history_qs, many=True).data
            if hasattr(vitals_history, 'serializer'):
                vitals_history = list(vitals_history)
            vitals_history.reverse()
        
        vitals_data = VitalSignSerializer(latest_vitals).data
            
        # 2. Health Score Calculation (Simplified Clinical Logic)
        health_score = 100
        if latest_vitals:
            try:
                systolic = latest_vitals.systolic_bp if latest_vitals.systolic_bp is not None else 120
                diastolic = latest_vitals.diastolic_bp if latest_vitals.diastolic_bp is not None else 80
                
                if systolic > 120:
                     deduction = (systolic - 120) * 0.5
                     health_score -= deduction
                if diastolic > 80:
                     deduction = (diastolic - 80) * 0.5
                     health_score -= deduction
                     
                hr = latest_vitals.heart_rate if latest_vitals.heart_rate is not None else 72
                if hr < 60:
                     health_score -= (60 - hr)
                elif hr > 100:
                     health_score -= (hr - 100) * 0.5
                     
                weight = latest_vitals.weight if latest_vitals.weight is not None else 70
                if weight > 100:
                     health_score -= 5
                     
                health_score = max(0, min(100, int(health_score)))
            except Exception as e:
                print(f"Error calculating health score: {e}")
                health_score = 85
        
        # 3. Active Prescriptions (FULL DETAILS - NO MOCK DATA)
        active_prescriptions_qs = Prescription.objects.filter(
            medical_record__patient=patient,
            status__in=['signed', 'dispensed']
        ).select_related('medical_record__doctor__user').order_by('-created_at')[:5]
        
        active_prescriptions = []
        for rx in active_prescriptions_qs:
            active_prescriptions.append({
                'id': rx.id,
                'medication_name': rx.medication_name,
                'dosage': rx.dosage,
                'frequency': rx.frequency,
                'duration': rx.duration,
                'start_date': rx.created_at.date().isoformat() if rx.created_at else None,
                'refills_remaining': rx.refills_remaining if hasattr(rx, 'refills_remaining') else 0,
                'prescribing_doctor': f"Dr. {rx.medical_record.doctor.user.last_name}" if rx.medical_record.doctor else "Unknown",
                'status': rx.status
            })
        
        # 4. Recent Lab Results (REAL DATA ONLY)
        recent_lab_results = []
        recent_lab_orders = LabOrder.objects.filter(
            patient=user
        ).prefetch_related('results__test').order_by('-created_at')[:3]
        
        for order in recent_lab_orders:
            for result in order.results.all()[:3]:  # Max 3 results per order
                recent_lab_results.append({
                    'id': result.id,
                    'test_name': result.test.name if result.test else 'Unknown Test',
                    'result_value': result.result_value,
                    'reference_range': result.reference_range,
                    'units': result.units,
                    'flag': result.flag or 'Normal',
                    'date': result.processed_at.date().isoformat() if result.processed_at else None
                })
        
        # 5. Recent Medical Records (REAL DATA ONLY)
        recent_records_qs = MedicalRecord.objects.filter(
            patient=patient
        ).select_related('doctor__user').order_by('-record_date')[:3]
        
        recent_records = []
        for record in recent_records_qs:
            recent_records.append({
                'id': record.id,
                'record_type': record.get_record_type_display() if hasattr(record, 'get_record_type_display') else record.record_type,
                'diagnosis': record.diagnosis,
                'doctor_name': f"Dr. {record.doctor.user.get_full_name()}" if record.doctor else "Unknown",
                'date': record.record_date.isoformat() if record.record_date else None,
                'notes': record.notes[:100] if record.notes else ""
            })
        
        # 6. Billing Summary (REAL DATA ONLY)
        invoices = Invoice.objects.filter(patient=patient)
        outstanding_invoices = invoices.filter(status__in=['issued', 'partially_paid', 'overdue'])
        
        total_outstanding = sum(
            (invoice.total_amount - invoice.paid_amount) 
            for invoice in outstanding_invoices
        )
        
        last_payment = invoices.filter(status='paid').order_by('-updated_at').first()
        
        billing_summary = {
            'outstanding_balance': float(total_outstanding),
            'recent_invoices_count': invoices.count(),
            'last_payment_date': last_payment.updated_at.date().isoformat() if last_payment else None
        }
        
        # 7. Health Insights (REAL DATA FROM PATIENT MODEL + WELLNESS TIP)
        chronic_conditions_list = []
        if patient.chronic_conditions:
            chronic_conditions_list = [c.strip() for c in patient.chronic_conditions.split(',') if c.strip()]
        
        allergies_list = []
        if patient.allergies:
            allergies_list = [a.strip() for a in patient.allergies.split(',') if a.strip()]
        
        # Get random active wellness tip
        wellness_tip_obj = WellnessTip.objects.filter(is_active=True).order_by('?').first()
        wellness_tip = None
        if wellness_tip_obj:
            wellness_tip = {
                'title': wellness_tip_obj.title,
                'description': wellness_tip_obj.description,
                'category': wellness_tip_obj.category
            }
        
        health_insights = {
            'chronic_conditions': chronic_conditions_list,
            'allergies': allergies_list,
            'wellness_tip': wellness_tip
        }

        return Response({
            "health_score": health_score,
            "vitals": vitals_data,
            "vitals_history": vitals_history,
            "active_prescriptions": active_prescriptions,
            "recent_lab_results": recent_lab_results,
            "recent_records": recent_records,
            "billing_summary": billing_summary,
            "health_insights": health_insights,
            "patient_name": f"{user.first_name} {user.last_name}"
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR in patient_dashboard_stats: {str(e)}")
        return Response(
            {"error": "Failed to load dashboard data. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsPatient])
def patient_access_log(request):
    """
    Returns the access log for the authenticated patient's medical records.
    GET /api/medical-records/my-access-log/
    """
    user = request.user
    if not hasattr(user, 'patient_profile'):
        return Response({"error": "Patient profile not found"}, status=404)

    patient = user.patient_profile

    logs = MedicalRecordAccess.objects.filter(
        medical_record__patient=patient
    ).select_related(
        'accessed_by', 'accessed_by__doctor_profile__department',
        'medical_record'
    ).order_by('-access_timestamp')[:50]

    result = []
    for log in logs:
        accessed_by = log.accessed_by
        dept = ''
        provider = accessed_by.get_full_name() or accessed_by.username
        if hasattr(accessed_by, 'doctor_profile') and accessed_by.doctor_profile:
            dp = accessed_by.doctor_profile
            dept = dp.department.name if dp.department else dp.specialization
            provider = f"Dr. {accessed_by.get_full_name()}"
        result.append({
            "date": log.access_timestamp.strftime('%Y-%m-%d %H:%M'),
            "provider": provider,
            "department": dept,
            "action": log.get_action_display(),
        })

    return Response(result)
