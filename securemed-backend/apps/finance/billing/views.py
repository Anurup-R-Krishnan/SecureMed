from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Invoice, Payment
from .serializers import InvoiceSerializer, PaymentSerializer
from apps.accounts.users.permissions import IsPatient

def get_patient_profile(user):
    if hasattr(user, 'patient_profile'):
        return user.patient_profile
    return None

@api_view(['GET'])
@permission_classes([IsPatient])
def get_invoices(request):
    user = request.user
    patient = get_patient_profile(user)
    
    if not patient:
        return Response({"error": "Patient profile not found."}, status=404)
        
    invoices = Invoice.objects.filter(patient=patient).select_related('appointment', 'appointment__doctor__user').prefetch_related('items', 'payments')
    serializer = InvoiceSerializer(invoices, many=True)
    
    total_billed = sum(item.total_amount for item in invoices)
    total_paid = sum(item.paid_amount for item in invoices)
    pending = total_billed - total_paid
    
    next_due = "N/A"
    overdue_or_pending = invoices.filter(status__in=['issued', 'partially_paid', 'overdue']).order_by('due_date').first()
    if overdue_or_pending:
        next_due = overdue_or_pending.due_date
    
    return Response({
        "invoices": serializer.data,
        "summary": {
            "totalBilled": total_billed,
            "totalPaid": total_paid,
            "pending": pending,
            "nextDueDate": next_due
        }
    })


@api_view(['POST'])
@permission_classes([IsPatient])
def pay_invoice(request, invoice_id):
    """
    Process payment for an invoice.
    In a real app, this would integrate with Stripe/PayPal.
    For this prototype, it marks the invoice as paid.
    """
    user = request.user
    patient = get_patient_profile(user)
    
    if not patient:
        return Response({"error": "Patient profile not found."}, status=404)
        
    try:
        invoice = Invoice.objects.get(invoice_id=invoice_id, patient=patient)
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found."}, status=404)
        
    if invoice.status == 'paid':
        return Response({"message": "Invoice is already paid."}, status=200)
        
    # Process "Payment"
    from django.utils import timezone
    import uuid
    
    payment_method = request.data.get('payment_method', 'card')
    
    # Create payment record
    payment_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    payment = Payment.objects.create(
        payment_id=payment_id,
        invoice=invoice,
        amount=invoice.total_amount - invoice.paid_amount,
        payment_method=payment_method,
        status='pending',
        transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}"
    )
    
    # Mark payment as completed (in real app, would wait for payment gateway)
    payment.status = 'completed'
    payment.save(update_fields=['status'])
    
    invoice.status = 'paid'
    invoice.paid_amount = invoice.total_amount
    invoice.save(update_fields=['status', 'paid_amount', 'updated_at'])
    
    return Response({
        "message": "Payment successful",
        "invoice_id": invoice.invoice_id,
        "payment_id": payment.payment_id,
        "status": invoice.status,
        "paid_amount": invoice.paid_amount,
        "date": timezone.now()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, payment_id):
    """
    Pharmacist or admin confirms a payment has been received.
    """
    user = request.user
    if not user.is_staff and user.role not in ['pharmacist', 'admin']:
        return Response({"error": "Unauthorized"}, status=403)
    
    try:
        payment = Payment.objects.get(payment_id=payment_id)
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found."}, status=404)
    
    if payment.status == 'completed':
        return Response({"message": "Payment already confirmed."}, status=200)
    
    from django.utils import timezone
    
    # Update payment status
    payment.status = 'completed'
    payment.processed_by = user
    payment.save(update_fields=['status', 'processed_by'])
    
    # Update invoice
    invoice = payment.invoice
    invoice.paid_amount += payment.amount
    
    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = 'paid'
    elif invoice.paid_amount > 0:
        invoice.status = 'partially_paid'
    
    invoice.save(update_fields=['status', 'paid_amount'])
    
    return Response({
        "message": "Payment confirmed",
        "payment_id": payment.payment_id,
        "invoice_status": invoice.status,
        "confirmed_by": user.email,
        "confirmed_at": timezone.now()
    })

