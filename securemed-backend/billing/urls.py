from django.urls import path
from . import views

urlpatterns = [
    path('invoices/', views.get_invoices, name='get_invoices'),
    path('invoices/<str:invoice_id>/pay/', views.pay_invoice, name='pay_invoice'),
]
