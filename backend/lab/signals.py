from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LabResult, LabOrder, Notification

@receiver(post_save, sender=LabResult)
def create_result_notification(sender, instance, created, **kwargs):
    if created or instance.verified_at:
        # Notify Doctor
        order = instance.order
        if order.ordering_doctor and order.ordering_doctor.user:
            message = f"Result available for Patient {order.patient.name} (Sample: {order.sample_id})"
            if instance.is_abnormal:
                message += " [ABNORMAL]"
            
            Notification.objects.create(
                user=order.ordering_doctor.user,
                message=message,
                is_read=False,
                related_order=order
            )
        
        # In a real app, also trigger email to Patient here
        # send_mail_to_patient(order.patient)
        print(f"[EMAIL STUB] Sending 'New Result Available' email to Patient: {order.patient.name}")
