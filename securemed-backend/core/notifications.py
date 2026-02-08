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
            
            # If result is critical, also send an alert
            if lab_result.flag == 'Critical':
                NotificationService.send_critical_lab_alert(lab_result)
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to send lab result notification: {str(e)}")
            return False

    @staticmethod
    def send_critical_lab_alert(lab_result):
        """
        Send urgent notification for critical lab results.
        
        Args:
            lab_result: LabResult instance
        """
        try:
            patient = lab_result.order.patient
            doctor = lab_result.order.doctor
            
            # 1. Alert the Patient
            subject_patient = "URGENT: Critical Lab Results"
            message_patient = f"""
Dear {patient.get_full_name()},

One of your lab results ({lab_result.test.name}) requires immediate attention. 
Your healthcare provider has been notified. 

Please log in to the portal and contact your doctor's office as soon as possible.

SecureMed Urgent Alerts
            """
            send_mail(
                subject=subject_patient,
                message=message_patient,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[patient.email],
                fail_silently=False,
            )

            # 2. Alert the Doctor
            if doctor:
                subject_doctor = f"CRITICAL RESULT ALERT: Patient {patient.get_full_name()}"
                message_doctor = f"""
CRITICAL LAB RESULT ALERT

Patient: {patient.get_full_name()} (ID: {patient.id})
Test: {lab_result.test.name}
Result: {lab_result.result_value} {lab_result.units}
Flag: CRITICAL

Please review this result and contact the patient immediately.
                """
                send_mail(
                    subject=subject_doctor,
                    message=message_doctor,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[doctor.email],
                    fail_silently=False,
                )
                
            # 3. SMS Alert (Placeholder)
            phone = getattr(patient, 'phone_number', None)
            if phone:
                NotificationService.send_sms(phone, f"URGENT: Critical lab result for {lab_result.test.name}. Please check your portal.")

            logger.info(f"Critical alerts sent for LabResult #{lab_result.id}")
            return True
        except Exception as e:
            logger.error(f"Failed to send critical alerts: {str(e)}")
            return False
    
    @staticmethod
    def send_sms(phone_number, message):
        """
        Send SMS notification.
        
        Args:
            phone_number: Recipient phone number
            message: SMS message content
        """
        # In development, we just log it.
        # Future: Integrate with Twilio/AWS SNS
        logger.info(f" [SMS SENT] To: {phone_number} | Message: {message}")
        
        # Simulating successful delivery
        return True

    @staticmethod
    def send_appointment_sms_reminder(appointment):
        """
        Send SMS reminder for an appointment.
        """
        phone = getattr(appointment.patient, 'phone_number', None)
        if not phone:
            return False
            
        msg = f"Reminder: Your appointment with Dr. {appointment.doctor.user.last_name} is on {appointment.start_time.strftime('%b %d at %I:%M %p')}."
        return NotificationService.send_sms(phone, msg)
