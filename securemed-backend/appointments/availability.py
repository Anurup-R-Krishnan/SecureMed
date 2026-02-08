"""
Doctor availability and time slot management for appointments.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta

from departments.models import Doctor
from .models import Appointment


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
    
    if not date_str:
        return Response(
            {'error': 'date parameter is required (format: YYYY-MM-DD)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
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
    
    # Generate time slots (9 AM to 5 PM, 30-minute intervals)
    slots = []
    current_time = datetime.strptime('09:00', '%H:%M')
    end_time = datetime.strptime('17:00', '%H:%M')
    
    while current_time < end_time:
        time_str = current_time.strftime('%H:%M')
        slots.append({
            'time': time_str,
            'available': time_str not in booked_times
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
