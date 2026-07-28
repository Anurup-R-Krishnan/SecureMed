from django.urls import path

from . import views

urlpatterns = [
    path('insurance/providers/', views.list_insurance_providers, name='insurance_providers'),
    path('admin/summary/', views.admin_billing_summary, name='admin_billing_summary'),
    path('invoices/', views.get_invoices, name='get_invoices'),
    path('invoices/<str:invoice_id>/', views.get_invoice_detail, name='get_invoice_detail'),
    path('invoices/<str:invoice_id>/download/', views.download_invoice, name='download_invoice'),
    path('invoices/<str:invoice_id>/pay/', views.pay_invoice, name='pay_invoice'),
    path('payments/<str:payment_id>/confirm/', views.confirm_payment, name='confirm_payment'),
    path('insurance/verify/', views.verify_insurance, name='verify_insurance'),
]
