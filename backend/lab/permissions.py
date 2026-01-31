from rest_framework import permissions

class IsLabTechnician(permissions.BasePermission):
    """
    Allocates permissions to users in the 'Lab Technician' group.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.groups.filter(name='Lab Technician').exists() or request.user.is_superuser

class IsDoctor(permissions.BasePermission):
    """
    Allocates permissions to users who have a Doctor profile.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'doctor') or request.user.is_superuser
