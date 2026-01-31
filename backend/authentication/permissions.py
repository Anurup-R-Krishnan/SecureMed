from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Permission class to allow access only to users with ADMIN role.
    User must be authenticated and have role == 'admin'.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsDoctor(BasePermission):
    """
    Permission class to allow access only to users with DOCTOR role.
    User must be authenticated and have role == 'provider' (doctor).
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'provider'
        )


class IsPatient(BasePermission):
    """
    Permission class to allow access only to users with PATIENT role.
    User must be authenticated and have role == 'patient'.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'patient'
        )


class IsDoctorOrPatient(BasePermission):
    """
    Permission class to allow access to users with either DOCTOR or PATIENT role.
    Useful for shared endpoints that both doctors and patients can access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['provider', 'patient']
        )
