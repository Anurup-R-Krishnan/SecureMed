from rest_framework import serializers
from .models import Invoice, InvoiceItem, Payment

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    doctor_name = serializers.SerializerMethodField()
    service_summary = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_id', 'issue_date', 'due_date', 'status', 
            'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 
            'paid_amount', 'doctor_name', 'service_summary', 'items'
        ]

    def get_doctor_name(self, obj):
        if obj.appointment and obj.appointment.doctor:
             doc_user = obj.appointment.doctor.user
             return f"Dr. {doc_user.first_name} {doc_user.last_name}"
        return "Unknown Doctor"

    def get_service_summary(self, obj):
        first_item = obj.items.first()
        if first_item:
            return first_item.description
        if obj.appointment:
            return f"Appointment on {obj.appointment.appointment_date}"
        return "Medical Services"
