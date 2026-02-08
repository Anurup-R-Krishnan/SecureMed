from django.urls import path
from . import views

urlpatterns = [
    path('timeline/', views.patient_timeline, name='patient_timeline'),
]
