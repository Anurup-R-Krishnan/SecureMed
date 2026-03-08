from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_patients, name='list_patients'),
    path('<int:pk>/', views.patient_detail, name='patient_detail'),
    path('timeline/', views.patient_timeline, name='patient_timeline'),
    path('profile/', views.profile_details, name='profile_details'),
]
