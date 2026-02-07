"""
Notification Handler for Appointment Confirmations
Sends automated email and SMS notifications when appointments are booked.
"""
from datetime import datetime
from audit.models import AuditLog


class NotificationHandler:
    """
    Handles sending email and SMS notifications for appointments.
    In production, this would integrate with services like SendGrid, Twilio, etc.
    For now, we simulate the notifications and log them.
    """
    
    @staticmethod
    def send_appointment_confirmation(appointment, patient_email=None, patient_phone=None):
        """
        Send appointment confirmation via email and SMS.
        
        Args:
            appointment: Appointment model instance
            patient_email: Patient's email address (optional)
            patient_phone: Patient's phone number (optional)
            
        Returns:
            dict: Status of email and SMS sending
        """
        from datetime import datetime, time as time_type, date as date_type
        
        # Handle date formatting - could be string or date object
        if isinstance(appointment.date, str):
            date_str = appointment.date
        elif isinstance(appointment.date, date_type):
            date_str = appointment.date.strftime('%B %d, %Y')
        else:
            date_str = str(appointment.date)
        
        # Handle time formatting - could be string or time object
        if isinstance(appointment.start_time, str):
            time_str = appointment.start_time
        elif isinstance(appointment.start_time, time_type):
            time_str = appointment.start_time.strftime('%I:%M %p')
        else:
            time_str = str(appointment.start_time)
        
        confirmation_data = {
            'confirmation_number': appointment.confirmation_number,
            'doctor_name': appointment.doctor.name,
            'date': date_str,
            'time': time_str,
            'patient_name': appointment.patient_name,
            'hospital': appointment.doctor.hospital,
            'fee': str(appointment.fee)
        }
        
        email_sent = False
        sms_sent = False
        
        # Simulate email sending
        if patient_email:
            email_sent = NotificationHandler._send_email(
                to_email=patient_email,
                subject=f"Appointment Confirmed - {confirmation_data['confirmation_number']}",
                data=confirmation_data
            )
        
        # Simulate SMS sending
        if patient_phone:
            sms_sent = NotificationHandler._send_sms(
                to_phone=patient_phone,
                data=confirmation_data
            )
        
        # Log notification attempt
        AuditLog.objects.create(
            user_id=appointment.patient_id,
            user_name=appointment.patient_name,
            user_role='patient',
            action='APPOINTMENT_NOTIFICATION_SENT',
            resource_type='appointment',
            resource_id=str(appointment.id),
            details={
                'confirmation_number': appointment.confirmation_number,
                'email_sent': email_sent,
                'sms_sent': sms_sent,
                'email': patient_email if email_sent else None,
                'phone': patient_phone if sms_sent else None
            },
            outcome='SUCCESS' if (email_sent or sms_sent) else 'PARTIAL'
        )
        
        return {
            'email_sent': email_sent,
            'sms_sent': sms_sent,
            'confirmation_number': appointment.confirmation_number
        }
    
    @staticmethod
    def _send_email(to_email, subject, data):
        """
        Simulate sending email.
        In production, integrate with SendGrid, AWS SES, etc.
        """
        # Simulate email template
        email_body = f"""
        Dear {data['patient_name']},
        
        Your appointment has been confirmed!
        
        Confirmation Number: {data['confirmation_number']}
        Doctor: {data['doctor_name']}
        Date: {data['date']}
        Time: {data['time']}
        Location: {data['hospital']}
        Consultation Fee: ₹{data['fee']}
        
        Please arrive 15 minutes early for check-in.
        
        If you need to reschedule or cancel, please contact us at least 24 hours in advance.
        
        Best regards,
        SecureMed Healthcare System
        """
        
        # In production, send actual email here
        # For now, just log it
        print(f"[EMAIL SIMULATION] To: {to_email}")
        print(f"[EMAIL SIMULATION] Subject: {subject}")
        print(f"[EMAIL SIMULATION] Body:\n{email_body}")
        
        return True  # Simulate successful send
    
    @staticmethod
    def _send_sms(to_phone, data):
        """
        Simulate sending SMS.
        In production, integrate with Twilio, AWS SNS, etc.
        """
        sms_body = (
            f"Appointment Confirmed! "
            f"Dr. {data['doctor_name']} on {data['date']} at {data['time']}. "
            f"Confirmation: {data['confirmation_number']}. "
            f"Location: {data['hospital']}"
        )
        
        # In production, send actual SMS here
        # For now, just log it
        print(f"[SMS SIMULATION] To: {to_phone}")
        print(f"[SMS SIMULATION] Message: {sms_body}")
        
        return True  # Simulate successful send
    
    @staticmethod
    def send_appointment_reminder(appointment, patient_email=None, patient_phone=None):
        """
        Send appointment reminder (24 hours before).
        Can be called by a scheduled task/cron job.
        """
        from datetime import datetime, time as time_type, date as date_type
        
        # Handle date formatting
        if isinstance(appointment.date, str):
            date_str = appointment.date
        elif isinstance(appointment.date, date_type):
            date_str = appointment.date.strftime('%B %d, %Y')
        else:
            date_str = str(appointment.date)
        
        # Handle time formatting
        if isinstance(appointment.start_time, str):
            time_str = appointment.start_time
        elif isinstance(appointment.start_time, time_type):
            time_str = appointment.start_time.strftime('%I:%M %p')
        else:
            time_str = str(appointment.start_time)
        
        reminder_data = {
            'confirmation_number': appointment.confirmation_number,
            'doctor_name': appointment.doctor.name,
            'date': date_str,
            'time': time_str,
            'patient_name': appointment.patient_name,
            'hospital': appointment.doctor.hospital
        }
        
        if patient_email:
            NotificationHandler._send_reminder_email(patient_email, reminder_data)
        
        if patient_phone:
            NotificationHandler._send_reminder_sms(to_phone=patient_phone, data=reminder_data)
        
        return True
    
    @staticmethod
    def _send_reminder_email(to_email, data):
        """Send reminder email"""
        email_body = f"""
        Dear {data['patient_name']},
        
        This is a reminder for your upcoming appointment:
        
        Doctor: {data['doctor_name']}
        Date: {data['date']}
        Time: {data['time']}
        Location: {data['hospital']}
        Confirmation: {data['confirmation_number']}
        
        Please arrive 15 minutes early.
        
        Best regards,
        SecureMed Healthcare System
        """
        
        print(f"[REMINDER EMAIL] To: {to_email}")
        print(f"[REMINDER EMAIL] Body:\n{email_body}")
        return True
    
    @staticmethod
    def _send_reminder_sms(to_phone, data):
        """Send reminder SMS"""
        sms_body = (
            f"Reminder: Appointment tomorrow with Dr. {data['doctor_name']} "
            f"at {data['time']}. Confirmation: {data['confirmation_number']}"
        )
        
        print(f"[REMINDER SMS] To: {to_phone}")
        print(f"[REMINDER SMS] Message: {sms_body}")
        return True
