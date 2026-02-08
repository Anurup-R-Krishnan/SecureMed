"""
Notification service for sending emails and SMS.
Supports appointment reminders, lab results, and other notifications.
"""
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending notifications via email and SMS."""
    
    @staticmethod
    def send_appointment_confirmation(appointment):
        """
        Send appointment confirmation email.
        
        Args:
            appointment: Appointment instance
        """
        try:
            subject = f"Appointment Confirmation - {appointment.start_time.strftime('%B %d, %Y')}"
            message = f"""
Dear {appointment.patient.user.get_full_name()},

Your appointment has been confirmed:

Doctor: Dr. {appointment.doctor.user.get_full_name()}
Date: {appointment.start_time.strftime('%B %d, %Y')}
Time: {appointment.start_time.strftime('%I:%M %p')}
Status: {appointment.get_status_display()}

Please arrive 15 minutes early.

Best regards,
SecureMed Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[appointment.patient.user.email],
                fail_silently=False,
            )
            
            logger.info(f"Appointment confirmation sent to {appointment.patient.user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send appointment confirmation: {str(e)}")
            return False
    
    @staticmethod
    def send_appointment_reminder(appointment):
        """
        Send appointment reminder email (24 hours before).
        
        Args:
            appointment: Appointment instance
        """
        try:
            subject = f"Appointment Reminder - Tomorrow at {appointment.start_time.strftime('%I:%M %p')}"
            message = f"""
Dear {appointment.patient.user.get_full_name()},

This is a reminder of your upcoming appointment:

Doctor: Dr. {appointment.doctor.user.get_full_name()}
Date: {appointment.start_time.strftime('%B %d, %Y')}
Time: {appointment.start_time.strftime('%I:%M %p')}

Please arrive 15 minutes early. If you need to cancel or reschedule, please contact us as soon as possible.

Best regards,
SecureMed Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[appointment.patient.user.email],
                fail_silently=False,
            )
            
            logger.info(f"Appointment reminder sent to {appointment.patient.user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send appointment reminder: {str(e)}")
            return False
    
    @staticmethod
    def send_lab_result_notification(lab_result):
        """
        Send lab result notification email.
        
        Args:
            lab_result: LabResult instance
        """
        try:
            patient = lab_result.order.patient
            subject = "Lab Results Available"
            message = f"""
Dear {patient.get_full_name()},

Your lab results for {lab_result.test.name} are now available.

Test: {lab_result.test.name}
Status: Completed
Processed: {lab_result.processed_at.strftime('%B %d, %Y')}

Please log in to your patient portal to view your results.

Best regards,
SecureMed Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[patient.email],
                fail_silently=False,
            )
            
            logger.info(f"Lab result notification sent to {patient.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send lab result notification: {str(e)}")
            return False
    
    @staticmethod
    def send_sms(phone_number, message):
        """
        Send SMS notification (placeholder for Twilio integration).
        
        Args:
            phone_number: Recipient phone number
            message: SMS message content
        """
        # TODO: Integrate with Twilio or similar SMS service
        logger.info(f"SMS would be sent to {phone_number}: {message}")
        return True
