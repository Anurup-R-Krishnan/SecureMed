from rest_framework import permissions

class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        # In a real app, check request.user.role
        # For this prototype, we'll look for a header or query param
        role = request.headers.get('X-User-Role') or request.query_params.get('role')
        return role == 'doctor'

class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        role = request.headers.get('X-User-Role') or request.query_params.get('role')
        return role == 'patient'

class AnyLoggedInUser(permissions.BasePermission):
    def has_permission(self, request, view):
        role = request.headers.get('X-User-Role') or request.query_params.get('role')
        return role in ['doctor', 'patient', 'admin', 'any']
