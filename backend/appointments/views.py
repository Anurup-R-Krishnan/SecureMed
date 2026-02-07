from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Doctor, Availability, Appointment
from .serializers import DoctorSerializer, AvailabilitySerializer, AppointmentSerializer
from .permissions import IsDoctor, IsPatient, AnyLoggedInUser
from audit.models import AuditLog
from datetime import datetime, timedelta
import uuid

class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [AnyLoggedInUser]

    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        date = request.query_params.get('date')
        if not date:
            return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        doctor = self.get_object()
        slots = Availability.objects.filter(doctor=doctor, date=date)
        appointments = Appointment.objects.filter(doctor=doctor, date=date).exclude(status='CANCELLED')
        
        booked_times = [a.start_time for a in appointments]
        
        # Deduplicate slots by start_time to check against database duplicates
        unique_slots_map = {}
        for slot in slots:
            if slot.start_time not in unique_slots_map:
                unique_slots_map[slot.start_time] = slot
        
        data = []
        # Sort by start_time
        sorted_slots = sorted(unique_slots_map.values(), key=lambda s: s.start_time)
        
        for slot in sorted_slots:
            data.append({
                'startTime': slot.start_time.strftime('%H:%M'),
                'endTime': slot.end_time.strftime('%H:%M'),
                'isAvailable': slot.slot_type == 'AVAILABLE' and slot.start_time not in booked_times,
                'isBooked': slot.start_time in booked_times,
                'slotType': slot.slot_type
            })
            
        return Response(data)

    @action(detail=True, methods=['post'], url_path='set-availability')
    def set_availability(self, request, pk=None):
        doctor = self.get_object()
        date = request.data.get('date')
        slots_data = request.data.get('slots', [])
        
        # Clear existing non-booked slots for that date
        Availability.objects.filter(doctor=doctor, date=date).delete()
        
        new_slots = []
        for s in slots_data:
            new_slots.append(Availability(
                doctor=doctor,
                date=date,
                start_time=s['startTime'],
                end_time=s.get('endTime', s['startTime']),
                slot_type=s['slotType']
            ))
        Availability.objects.bulk_create(new_slots)

        AuditLog.objects.create(
            user_id=str(doctor.id), # In real app use request.user
            user_name=doctor.name,
            user_role='doctor',
            action='AVAILABILITY_UPDATED',
            resource_type='doctor_schedule',
            resource_id=str(doctor.id),
            details={'date': date, 'slot_count': len(new_slots)},
            outcome='SUCCESS'
        )

        return Response({'success': True})

    @action(detail=True, methods=['post'], url_path='set-recurring')
    def set_recurring(self, request, pk=None):
        doctor = self.get_object()
        start_date = datetime.strptime(request.data.get('startDate'), '%Y-%m-%d').date()
        end_date = datetime.strptime(request.data.get('endDate'), '%Y-%m-%d').date()
        recurring_days = request.data.get('recurringDays', []) # [0,1,2,3,4,5,6] Mon is 0 in JS? No, JS is 0=Sun. Python is 0=Mon or iso 1=Mon.
        # JS Date.getDay() 0=Sun. 
        # Python weekday() 0=Mon, 6=Sun.
        slots_data = request.data.get('slots', [])
        
        current = start_date
        updated_dates = []
        while current <= end_date:
            js_day = (current.weekday() + 1) % 7 # Map Python 0-6 (M-S) to JS 0-6 (S-S)
            if js_day in recurring_days:
                Availability.objects.filter(doctor=doctor, date=current).delete()
                new_slots = [Availability(
                    doctor=doctor,
                    date=current,
                    start_time=s['startTime'],
                    end_time=s.get('endTime', s['startTime']),
                    slot_type=s['slotType']
                ) for s in slots_data]
                Availability.objects.bulk_create(new_slots)
                updated_dates.append(current.strftime('%Y-%m-%d'))
            current += timedelta(days=1)
            
        AuditLog.objects.create(
            user_id=str(doctor.id),
            user_name=doctor.name,
            user_role='doctor',
            action='RECURRING_AVAILABILITY_SET',
            resource_type='doctor_schedule',
            resource_id=str(doctor.id),
            details={
                'start_date': request.data.get('startDate'),
                'end_date': request.data.get('endDate'),
                'days_updated_count': len(updated_dates)
            },
            outcome='SUCCESS'
        )

        return Response({'success': True, 'updatedDates': updated_dates})

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [AnyLoggedInUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        doctor_id = self.request.query_params.get('doctor')
        patient_id = self.request.query_params.get('patient_id')
        date = self.request.query_params.get('date')
        
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        patient_id = request.data.get('patientId')
        patient_name = request.data.get('patientName')
        doctor_id = request.data.get('doctorId')
        date = request.data.get('date')
        start_time = request.data.get('startTime')
        reason = request.data.get('reason')
        patient_email = request.data.get('patientEmail', f'{patient_id}@example.com')  # Default email for demo
        patient_phone = request.data.get('patientPhone', '+91-9999999999')  # Default phone for demo

        # Concurrency Check: Lock the physician's schedule for that slot
        # In a real DB we'd use select_for_update, but for SQLite we rely on transaction isolation
        doctor = Doctor.objects.select_for_update().get(id=doctor_id)
        
        existing = Appointment.objects.filter(
            doctor_id=doctor_id, 
            date=date, 
            start_time=start_time
        ).exclude(status='CANCELLED').exists()

        if existing:
            return Response({
                'success': False, 
                'error': 'SLOT_TAKEN', 
                'message': 'This slot was just booked by another patient.'
            }, status=status.HTTP_409_CONFLICT)

        appointment = Appointment.objects.create(
            patient_id=patient_id,
            patient_name=patient_name,
            doctor_id=doctor_id,
            date=date,
            start_time=start_time,
            end_time=start_time, # Simplified
            reason_for_visit=reason,
            confirmation_number=f"APT-{uuid.uuid4().hex[:8].upper()}",
            fee=doctor.fee
        )

        # Audit Log
        AuditLog.objects.create(
            user_id=patient_id,
            user_name=patient_name,
            user_role='patient',
            action='APPOINTMENT_BOOKED',
            resource_type='appointment',
            resource_id=str(appointment.id),
            details={
                'doctor_id': doctor_id,
                'doctor_name': doctor.name,
                'date': date,
                'start_time': start_time,
                'confirmation_number': appointment.confirmation_number
            },
            outcome='SUCCESS'
        )

        # Send automated email/SMS confirmations
        from .notification_handler import NotificationHandler
        notification_result = NotificationHandler.send_appointment_confirmation(
            appointment=appointment,
            patient_email=patient_email,
            patient_phone=patient_phone
        )

        return Response({
            'success': True,
            'appointment': AppointmentSerializer(appointment).data,
            'confirmationNumber': appointment.confirmation_number,
            'notifications': {
                'emailSent': notification_result['email_sent'],
                'smsSent': notification_result['sms_sent']
            }
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        appointment_id = str(instance.id)
        patient_id = instance.patient_id
        patient_name = instance.patient_name
        
        # In a real app we'd get user from request.user
        # For now we use the data on the model
        
        instance.delete()

        AuditLog.objects.create(
            user_id=patient_id,
            user_name=patient_name,
            user_role='patient',
            action='APPOINTMENT_CANCELLED',
            resource_type='appointment',
            resource_id=appointment_id,
            details={'reason': 'User requested cancellation'},
            outcome='SUCCESS'
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        instance = self.get_object()
        
        # Audit the change
        AuditLog.objects.create(
            user_id="SYSTEM" if not request.headers.get('X-User-Role') else "USER", # Simplified
            user_name="System/Doctor",
            user_role=request.headers.get('X-User-Role', 'unknown'),
            action='APPOINTMENT_STATUS_UPDATED',
            resource_type='appointment',
            resource_id=str(instance.id),
            details={
                'new_status': instance.status,
                'confirmation_number': instance.confirmation_number
            },
            outcome='SUCCESS'
        )
        return response
