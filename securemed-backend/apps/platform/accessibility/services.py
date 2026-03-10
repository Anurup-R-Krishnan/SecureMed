import re
from datetime import datetime, timedelta
from apps.accounts.users.models import User
from apps.scheduling.appointments.models import Appointment, DoctorAvailabilitySlot
from apps.scheduling.availability.models import Doctor
from django.db.models import Q

class IntentMatcher:
    def __init__(self, user):
        self.user = user

    def process(self, text):
        text = text.lower().strip()
        
        # 1. Navigation Intents
        nav_targets = [
            {
                'name': 'Dashboard',
                'url': '/patient/dashboard',
                'patterns': [r'dashboard', r'home', r'main page', r'overview']
            },
            # The remaining targets will be expanded in subsequent steps
            {'name': 'Billing', 'url': '/patient/billing', 'patterns': [r'billing', r'invoice', r'payment']},
            {'name': 'Records', 'url': '/patient/records', 'patterns': [r'records', r'my health', r'medical history', r'reports']},
            {'name': 'Interactions', 'url': '/patient/interactions', 'patterns': [r'interaction', r'medication', r'drug side effects']},
            {'name': 'Appointments', 'url': '/patient/appointments', 'patterns': [r'my appointments', r'schedule']},
            {'name': 'Profile', 'url': '/patient/profile', 'patterns': [r'profile', r'my account']},
            {'name': 'Settings', 'url': '/patient/settings', 'patterns': [r'settings', r'preferences']},
            {'name': 'Referrals', 'url': '/patient/referrals', 'patterns': [r'referral']},
            {'name': 'Telemedicine', 'url': '/patient/telemedicine', 'patterns': [r'telemedicine', r'video call', r'virtual visit', r'doctor video']},
        ]

        for target in nav_targets:
            for pattern in target['patterns']:
                if re.search(pattern, text):
                    return {
                        "intent": "NAVIGATE",
                        "data": {"page": target['name'].lower(), "url": target['url']},
                        "feedback": f"Navigating to {target['name']}."
                    }

        # 2. Appointment Booking Intent
        # Pattern: "Book an appointment with Dr. [Name] for [Time/Date]"
        booking_match = re.search(r'(?:book|schedule|make)\s+(?:an\s+)?appointment\s+(?:with|to)\s+(?:dr\.?\s+)?([a-z\s]+?)(?:\s+for|\s+at|\s+on|$)', text)
        if booking_match:
            doctor_name_query = booking_match.group(1).strip()
            
            # Find User first
            user_doctors = User.objects.filter(
                role='doctor',
                is_active=True
            ).filter(
                Q(first_name__icontains=doctor_name_query) | 
                Q(last_name__icontains=doctor_name_query) | 
                Q(username__icontains=doctor_name_query)
            )

            if not user_doctors.exists():
                return {
                    "intent": "ERROR",
                    "feedback": f"I couldn't find a doctor named Dr. {doctor_name_query.capitalize()}. Please try another name."
                }
            
            # Get the doctor profile
            user_doc = user_doctors.first()
            try:
                doctor = user_doc.doctor_profile
            except Exception:
                return {
                    "intent": "ERROR",
                    "feedback": f"Dr. {user_doc.last_name} does not have a clinical profile set up for booking."
                }

            # Simple date logic
            target_date = datetime.now()
            if 'tomorrow' in text:
                target_date += timedelta(days=1)
            elif 'tuesday' in text:
                days_ahead = (1 - target_date.weekday() + 7) % 7
                if days_ahead == 0: days_ahead = 7
                target_date += timedelta(days=days_ahead)
            # ... default to tomorrow if no day found but "next Tuesday" might be in text
            
            date_str = target_date.strftime('%Y-%m-%d')
            
            # Check availability (Real DB check)
            available_slots = DoctorAvailabilitySlot.objects.filter(
                doctor=doctor,
                date=date_str,
                slot_type='available',
                is_active=True
            )

            # Check if any slot is already booked via Appointment model for that doctor/date
            booked_times = Appointment.objects.filter(
                doctor=doctor,
                appointment_date=date_str,
                status__in=['scheduled', 'confirmed', 'in_progress']
            ).values_list('appointment_time', flat=True)

            # Filter out booked slots
            free_slots = [s for s in available_slots if s.start_time not in booked_times]

            if not free_slots:
                return {
                    "intent": "ERROR",
                    "feedback": f"Dr. {user_doc.last_name} is not available on {date_str}. Would you like to check another day?",
                    "data": {"doctor_id": doctor.id, "doctor_name": user_doc.get_full_name()}
                }

            # Pick the first available slot
            slot = free_slots[0]
            
            return {
                "intent": "BOOK_APPOINTMENT",
                "data": {
                    "doctor_id": doctor.id,
                    "doctor_name": user_doc.get_full_name(),
                    "date": date_str,
                    "time": slot.start_time.strftime('%H:%M'),
                    "slot_id": slot.id
                },
                "feedback": f"Found an opening with Dr. {user_doc.last_name} on {date_str} at {slot.start_time.strftime('%I:%M %p')}. Opening the booking modal for you."
            }

        return {
            "intent": "UNKNOWN",
            "feedback": "I heard you, but I'm not sure what you want me to do. You can say things like 'Go to Billing' or 'Book Dr. Smith'."
        }
