from django.urls import path
from . import views

urlpatterns = [
    path('invoices/', views.get_invoices, name='get_invoices'),
    path('invoices/<str:invoice_id>/pay/', views.pay_invoice, name='pay_invoice'),
    path('payments/<str:payment_id>/confirm/', views.confirm_payment, name='confirm_payment'),
    path('insurance/verify/', views.verify_insurance, name='verify_insurance'),
]
