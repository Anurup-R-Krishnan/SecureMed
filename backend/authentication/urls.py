from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'authentication'

# Create router for user management endpoints
router = DefaultRouter()
router.register(r'users', views.UserManagementViewSet, basename='user-management')

urlpatterns = [
    # Registration and Login
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    
    # JWT Token Refresh
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Profile
    path('user/', views.user_profile_view, name='user_profile'),
    
    # MFA Endpoints
    path('mfa/setup/', views.mfa_setup_view, name='mfa_setup'),
    path('mfa/verify/', views.mfa_verify_view, name='mfa_verify'),
    path('mfa/deactivate/', views.mfa_deactivate_view, name='mfa_deactivate'),
    path('mfa/recovery-codes/regenerate/', views.regenerate_recovery_codes_view, name='regenerate_recovery_codes'),
    path('mfa/login/', views.mfa_login_view, name='mfa_login'),
    
    # Logout
    path('logout/', views.LogoutView.as_view(), name='auth_logout'),
    
    # Account Deletion (Right to be Forgotten - Story 2.3)
    path('request-deletion/', views.RequestAccountDeletionView.as_view(), name='request-deletion'),
    path('deletion-certificate/', views.DownloadDeletionCertificateView.as_view(), name='deletion-certificate'),
    
    # Policy Updates (Story 2.4)
    path('accept-policy/', views.AcceptLatestPolicyView.as_view(), name='accept-policy'),
    path('download-policy-receipt/', views.DownloadPolicyReceiptView.as_view(), name='download-policy-receipt'),
    
    # RBAC Testing
    path('admin-test/', views.admin_test_view, name='admin_test'),
    
    # Invitation System
    path('invite/send/', views.SendInviteView.as_view(), name='send_invite'),
    path('invite/verify/', views.verify_invite_view, name='verify_invite'),
    
    # User Management (Admin only) - Story 1.2
    path('', include(router.urls)),
]
