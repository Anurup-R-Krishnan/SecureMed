from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'authentication'

urlpatterns = [
    # Registration and Login
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    
    # JWT Token Refresh
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # MFA Endpoints
    path('mfa/setup/', views.mfa_setup_view, name='mfa_setup'),
    path('mfa/verify/', views.mfa_verify_view, name='mfa_verify'),
    path('mfa/login/', views.mfa_login_view, name='mfa_login'),
]
