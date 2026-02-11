from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Invoice
from .serializers import InvoiceSerializer
from authentication.permissions import IsPatient

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
        
    invoices = Invoice.objects.filter(patient=patient).select_related('appointment', 'appointment__doctor__user').prefetch_related('items')
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
    # Mocking successful payment
    from django.utils import timezone
    
    invoice.status = 'paid'
    invoice.paid_amount = invoice.total_amount
    invoice.save(update_fields=['status', 'paid_amount', 'updated_at'])
    
    return Response({
        "message": "Payment successful",
        "invoice_id": invoice.invoice_id,
        "status": invoice.status,
        "paid_amount": invoice.paid_amount,
        "date": timezone.now()
    })
