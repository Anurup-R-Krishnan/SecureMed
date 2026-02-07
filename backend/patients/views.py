from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Patient, TimelineEvent, ClinicalNote, Referral, BreakGlassSession
from .serializers import (
    PatientSerializer, TimelineEventSerializer, 
    ClinicalNoteSerializer, ReferralSerializer, BreakGlassSessionSerializer
)
from audit.models import AuditLog
from datetime import datetime, timedelta
from django.utils import timezone
from appointments.models import Doctor
from appointments.permissions import AnyLoggedInUser, IsDoctor

class PatientViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [AnyLoggedInUser]

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        patient = self.get_object()
        events = TimelineEvent.objects.filter(patient=patient).order_by('-date')
        serializer = TimelineEventSerializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def notes(self, request, pk=None):
        patient = self.get_object()
        if request.method == 'GET':
            notes = ClinicalNote.objects.filter(patient=patient).order_by('-created_at')
            serializer = ClinicalNoteSerializer(notes, many=True)
            return Response(serializer.data)
        else:
            doctor_id = request.data.get('doctorId')
            content = request.data.get('content')
            category = request.data.get('category')
            note = ClinicalNote.objects.create(
                patient=patient,
                doctor_id=doctor_id,
                content=content,
                category=category
            )
            
            # Audit the creation of clinical note
            AuditLog.objects.create(
                user_id=doctor_id,
                user_name="Doctor",
                user_role='doctor',
                action='CLINICAL_NOTE_ADDED',
                resource_type='patient_record',
                resource_id=str(patient.id),
                details={'category': category},
                outcome='SUCCESS'
            )
            
            return Response(ClinicalNoteSerializer(note).data, status=status.HTTP_201_CREATED)

class ClinicalActionViewSet(viewsets.ViewSet):
    permission_classes = [IsDoctor]
    @action(detail=False, methods=['post'], url_path='break-glass')
    def break_glass(self, request):
        """
        Trigger break-glass emergency access for a patient not assigned to the doctor.
        """
        doctor_id = request.data.get('doctorId')
        doctor_name = request.data.get('doctorName')
        patient_id = request.data.get('patientId')
        justification = request.data.get('justification')

        if not all([doctor_id, patient_id, justification]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            
            patient = Patient.objects.get(id=patient_id)
            doctor = Doctor.objects.get(id=doctor_id)
            
            # Set expiry to 1 hour from now
            expiry_time = timezone.now() + timedelta(hours=1)
            
            # Create break-glass session
            BreakGlassSession.objects.create(
                doctor=doctor,
                patient=patient,
                justification=justification,
                expires_at=expiry_time
            )

            # Audit log
            AuditLog.objects.create(
                user_id=doctor_id,
                user_name=doctor_name,
                user_role='doctor',
                action='BREAK_GLASS_ACCESS',
                resource_type='patient',
                resource_id=patient_id,
                details={
                    'justification': justification,
                    'patient_name': patient.name,
                    'expires_at': expiry_time.isoformat()
                },
                outcome='SUCCESS'
            )

            return Response({
                'success': True,
                'message': 'Emergency access granted.',
                'expiresAt': expiry_time.isoformat()
            })
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='refer')
    def refer(self, request):
        patient_id = request.data.get('patientId')
        from_doctor_id = request.data.get('fromDoctorId')
        from_doctor_name = request.data.get('fromDoctorName')
        to_doctor_id = request.data.get('toDoctorId')
        to_doctor_name = request.data.get('toDoctorName')

        Referral.objects.create(
            patient_id=patient_id,
            from_doctor_id=from_doctor_id,
            to_doctor_id=to_doctor_id,
            expires_at=datetime.now() + timedelta(days=30)
        )

        AuditLog.objects.create(
            user_id=from_doctor_id,
            user_name=from_doctor_name,
            user_role='doctor',
            action='PATIENT_REFERRED',
            resource_type='patient_record',
            resource_id=patient_id,
            details={'toDoctorId': to_doctor_id, 'toDoctorName': to_doctor_name},
            outcome='SUCCESS'
        )

        return Response({'success': True, 'message': f'Patient referred to {to_doctor_name}.'})

    @action(detail=False, methods=['get'], url_path='my-patients')
    def my_patients(self, request):
        """
        Get all patients assigned to a doctor via referrals.
        Auto-revokes expired referrals.
        """
        doctor_id = request.query_params.get('doctorId')
        
        if not doctor_id:
            return Response({'error': 'Doctor ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.utils import timezone
        
        # Auto-revoke expired referrals
        expired_referrals = Referral.objects.filter(
            to_doctor_id=doctor_id,
            is_active=True,
            expires_at__lt=timezone.now()
        )
        
        expired_count = expired_referrals.count()
        if expired_count > 0:
            expired_referrals.update(is_active=False)
            
            # Log auto-revocation
            for referral in expired_referrals:
                AuditLog.objects.create(
                    user_id='SYSTEM',
                    user_name='Auto-Revoke Service',
                    user_role='system',
                    action='REFERRAL_AUTO_REVOKED',
                    resource_type='referral',
                    resource_id=str(referral.id),
                    details={
                        'patient_id': str(referral.patient_id),
                        'doctor_id': doctor_id,
                        'reason': 'Referral expired'
                    },
                    outcome='SUCCESS'
                )
        
        # Get active referrals
        active_referrals = Referral.objects.filter(
            to_doctor_id=doctor_id,
            is_active=True
        ).select_related('patient', 'from_doctor')
        
        # Get expired referrals for display
        expired_referrals_display = Referral.objects.filter(
            to_doctor_id=doctor_id,
            is_active=False
        ).select_related('patient', 'from_doctor')[:10]  # Limit to last 10
        
        # Combine and format data
        patients_data = []
        
        for referral in active_referrals:
            patients_data.append({
                'patient_id': referral.patient.id,
                'patient_name': referral.patient.name,
                'assigned_date': referral.created_at.isoformat() if hasattr(referral, 'created_at') else timezone.now().isoformat(),
                'assigned_by': referral.from_doctor.name,
                'referral_reason': 'Specialist consultation',
                'is_active': True,
                'expires_at': referral.expires_at.isoformat() if referral.expires_at else None,
                'blood_group': referral.patient.blood_group,
                'known_allergies': referral.patient.known_allergies
            })
        
        for referral in expired_referrals_display:
            patients_data.append({
                'patient_id': referral.patient.id,
                'patient_name': referral.patient.name,
                'assigned_date': referral.created_at.isoformat() if hasattr(referral, 'created_at') else timezone.now().isoformat(),
                'assigned_by': referral.from_doctor.name,
                'referral_reason': 'Specialist consultation',
                'is_active': False,
                'expires_at': referral.expires_at.isoformat() if referral.expires_at else None,
                'blood_group': referral.patient.blood_group,
                'known_allergies': referral.patient.known_allergies
            })
        
        return Response(patients_data)

    @action(detail=False, methods=['post'], url_path='admin-grant')
    def admin_grant(self, request):
        """
        Admin endpoint to manually grant patient access to a doctor.
        """
        patient_id = request.data.get('patientId')
        doctor_id = request.data.get('doctorId')
        admin_id = request.data.get('adminId')
        reason = request.data.get('reason', 'Admin override')
        
        if not all([patient_id, doctor_id, admin_id]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from django.utils import timezone
            
            patient = Patient.objects.get(id=patient_id)
            doctor = Doctor.objects.get(id=doctor_id)
            
            # Create or reactivate referral
            referral, created = Referral.objects.get_or_create(
                patient=patient,
                to_doctor=doctor,
                defaults={
                    'from_doctor': doctor,  # Self-referral for admin grant
                    'is_active': True,
                    'expires_at': timezone.now() + timedelta(days=90)  # 90 days for admin grants
                }
            )
            
            if not created:
                referral.is_active = True
                referral.expires_at = timezone.now() + timedelta(days=90)
                referral.save()
            
            # Audit log
            AuditLog.objects.create(
                user_id=admin_id,
                user_name='Administrator',
                user_role='admin',
                action='ADMIN_GRANT_ACCESS',
                resource_type='referral',
                resource_id=str(referral.id),
                details={
                    'patient_id': patient_id,
                    'patient_name': patient.name,
                    'doctor_id': doctor_id,
                    'doctor_name': doctor.name,
                    'reason': reason
                },
                outcome='SUCCESS'
            )
            
            return Response({'success': True, 'message': 'Access granted successfully'})
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='admin-revoke')
    def admin_revoke(self, request):
        """
        Admin endpoint to manually revoke patient access from a doctor.
        """
        patient_id = request.data.get('patientId')
        doctor_id = request.data.get('doctorId')
        admin_id = request.data.get('adminId')
        reason = request.data.get('reason', 'Admin override')
        
        if not all([patient_id, doctor_id, admin_id]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Revoke all active referrals
            referrals = Referral.objects.filter(
                patient_id=patient_id,
                to_doctor_id=doctor_id,
                is_active=True
            )
            
            revoked_count = referrals.update(is_active=False)
            
            # Audit log
            AuditLog.objects.create(
                user_id=admin_id,
                user_name='Administrator',
                user_role='admin',
                action='ADMIN_REVOKE_ACCESS',
                resource_type='referral',
                resource_id=patient_id,
                details={
                    'patient_id': patient_id,
                    'doctor_id': doctor_id,
                    'reason': reason,
                    'referrals_revoked': revoked_count
                },
                outcome='SUCCESS'
            )
            
            return Response({'success': True, 'message': f'Access revoked successfully ({revoked_count} referrals)'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
