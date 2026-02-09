"""
Doctor availability and time slot management for appointments.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta, time as time_value

from departments.models import Doctor
from .models import Appointment, DoctorAvailabilitySlot


def _parse_date_param(date_str):
    if not date_str:
        return None, Response(
            {'error': 'date parameter is required (format: YYYY-MM-DD)'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date(), None
    except ValueError:
        return None, Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )


def _parse_time_value(value):
    if not value:
        return None

    value = value.strip()
    try:
        if len(value.split(':')) == 2:
            return datetime.strptime(value, '%H:%M').time()
        return datetime.strptime(value, '%H:%M:%S').time()
    except ValueError:
        return None


def _serialize_schedule_slots(slots):
    return [
        {
            'id': slot.id,
            'startTime': slot.start_time.strftime('%H:%M'),
            'endTime': slot.end_time.strftime('%H:%M'),
            'type': slot.slot_type,
        }
        for slot in slots
    ]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_doctor_availability(request, doctor_id):
    """
    Get available time slots for a specific doctor on a given date.
    
    GET /api/appointments/doctors/{doctor_id}/availability/?date=2026-02-10
    
    Response:
    {
        "doctor_id": 1,
        "doctor_name": "Dr. Smith",
        "date": "2026-02-10",
        "slots": [
            {"time": "09:00", "available": true},
            {"time": "09:30", "available": false},
            ...
        ]
    }
    """
    date_str = request.query_params.get('date')
    date, error_response = _parse_date_param(date_str)
    if error_response:
        return error_response
    
    # Don't allow past dates
    if date < timezone.now().date():
        return Response(
            {'error': 'Cannot check availability for past dates'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        doctor = Doctor.objects.get(id=doctor_id)
    except Doctor.DoesNotExist:
        return Response(
            {'error': 'Doctor not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get existing appointments for this doctor on this date
    existing_appointments = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=date,
        status__in=['scheduled', 'confirmed']
    ).values_list('appointment_time', flat=True)

    booked_times = set(str(t)[:5] for t in existing_appointments)

    # Load custom schedule slots for the date
    schedule_slots = list(
        DoctorAvailabilitySlot.objects.filter(
            doctor=doctor,
            date=date,
            is_active=True
        ).order_by('start_time')
    )

    has_schedule = len(schedule_slots) > 0
    available_ranges = [slot for slot in schedule_slots if slot.slot_type == 'available']
    blocked_ranges = [slot for slot in schedule_slots if slot.slot_type in ['surgery', 'break']]

    def slot_type_for_time(slot_time):
        if not has_schedule:
            return 'available'

        in_blocked = next((s for s in blocked_ranges if s.start_time <= slot_time < s.end_time), None)
        if in_blocked:
            return in_blocked.slot_type

        in_available = any(s.start_time <= slot_time < s.end_time for s in available_ranges)
        if in_available:
            return 'available'

        return 'unavailable'

    # Generate time slots (9 AM to 5 PM, 30-minute intervals)
    slots = []
    current_time = datetime.strptime('09:00', '%H:%M')
    end_time = datetime.strptime('17:00', '%H:%M')

    while current_time < end_time:
        time_str = current_time.strftime('%H:%M')
        slot_time_value = current_time.time()
        slot_type = slot_type_for_time(slot_time_value)
        is_booked = time_str in booked_times
        is_available = slot_type == 'available' and not is_booked
        slots.append({
            'time': time_str,
            'available': is_available,
            'slot_type': slot_type,
            'is_booked': is_booked,
        })
        current_time += timedelta(minutes=30)
    
    return Response({
        'doctor_id': doctor.id,
        'doctor_name': f"Dr. {doctor.user.last_name}",
        'specialty': doctor.specialization,
        'date': date_str,
        'slots': slots
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_doctors(request):
    """
    Get list of doctors with their specializations.
    
    GET /api/appointments/doctors/available/
    
    Response:
    {
        "doctors": [
            {"id": 1, "name": "Dr. Smith", "specialty": "Cardiology"},
            ...
        ]
    }
    """
    doctors = Doctor.objects.select_related('user').all()
    
    doctor_list = [{
        'id': doctor.id,
        'name': f"Dr. {doctor.user.first_name} {doctor.user.last_name}",
        'specialty': doctor.specialization,
        'department': doctor.department.name if doctor.department else None,
    } for doctor in doctors]
    
    return Response({'doctors': doctor_list})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def doctor_availability_schedule(request):
    """
    Get or update the authenticated doctor's availability schedule for a date.

    GET  /api/appointments/doctor/availability/?date=2026-02-10
    POST /api/appointments/doctor/availability/

    Payload:
    {
        "date": "2026-02-10",
        "slots": [
            {"startTime": "09:00", "endTime": "10:00", "type": "available"}
        ]
    }
    """
    if not hasattr(request.user, 'doctor_profile'):
        return Response({'error': 'Doctor profile required'}, status=status.HTTP_403_FORBIDDEN)

    date_str = request.query_params.get('date') if request.method == 'GET' else request.data.get('date')
    date, error_response = _parse_date_param(date_str)
    if error_response:
        return error_response

    doctor = request.user.doctor_profile

    if request.method == 'GET':
        slots = list(
            DoctorAvailabilitySlot.objects.filter(
                doctor=doctor,
                date=date,
                is_active=True
            ).order_by('start_time')
        )

        if not slots:
            return Response({
                'doctor_id': doctor.id,
                'date': date_str,
                'slots': [
                    {
                        'id': 'default',
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'type': 'available',
                    }
                ]
            })

        return Response({
            'doctor_id': doctor.id,
            'date': date_str,
            'slots': _serialize_schedule_slots(slots)
        })

    slots_payload = request.data.get('slots', [])
    if slots_payload is None:
        slots_payload = []

    if not isinstance(slots_payload, list):
        return Response({'error': 'slots must be a list'}, status=status.HTTP_400_BAD_REQUEST)

    DoctorAvailabilitySlot.objects.filter(doctor=doctor, date=date).delete()

    created_slots = []
    for slot in slots_payload:
        start_time = _parse_time_value(slot.get('startTime'))
        end_time = _parse_time_value(slot.get('endTime'))
        slot_type = slot.get('type', 'available')

        if not start_time or not end_time:
            return Response({'error': 'Invalid slot time format. Use HH:MM.'}, status=status.HTTP_400_BAD_REQUEST)

        if end_time <= start_time:
            return Response({'error': 'Slot endTime must be after startTime.'}, status=status.HTTP_400_BAD_REQUEST)

        if slot_type not in ['available', 'surgery', 'break']:
            return Response({'error': 'Invalid slot type.'}, status=status.HTTP_400_BAD_REQUEST)

        created_slots.append(
            DoctorAvailabilitySlot(
                doctor=doctor,
                date=date,
                start_time=start_time,
                end_time=end_time,
                slot_type=slot_type,
                is_active=True
            )
        )

    if created_slots:
        DoctorAvailabilitySlot.objects.bulk_create(created_slots)

    updated_slots = list(
        DoctorAvailabilitySlot.objects.filter(
            doctor=doctor,
            date=date,
            is_active=True
        ).order_by('start_time')
    )

    return Response({
        'doctor_id': doctor.id,
        'date': date_str,
        'slots': _serialize_schedule_slots(updated_slots)
    })
