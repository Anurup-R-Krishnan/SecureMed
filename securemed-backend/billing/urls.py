from django.urls import path
from . import views

urlpatterns = [
    path('invoices/', views.get_invoices, name='get_invoices'),
]
