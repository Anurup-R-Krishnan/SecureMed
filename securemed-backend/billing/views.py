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
