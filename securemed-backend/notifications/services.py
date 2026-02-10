import os
import logging
from django.core.mail import send_mail
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

def send_email_notification(subject, message, recipient_list):
    """
    Sends an email notification.
    """
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipient_list,
            fail_silently=False,
        )
        logger.info(f"Email sent successfully to {recipient_list}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_list}: {str(e)}")
        return False

def send_sms_notification(body, to_number):
    """
    Sends an SMS notification using Twilio.
    """
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_number = os.environ.get('TWILIO_PHONE_NUMBER')

    if not all([account_sid, auth_token, from_number]):
        logger.warning("Twilio credentials not found. SMS notification skipped.")
        return False

    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number
        )
        logger.info(f"SMS sent successfully to {to_number}: SID {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio error sending SMS to {to_number}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending SMS to {to_number}: {str(e)}")
        return False
