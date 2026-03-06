import logging
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)

class RoleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 0. JWT FORCE AUTHENTICATION
        # Standard Django Middleware doesn't see JWTs, so we parse it manually here.
        if not request.user.is_authenticated:
            try:
                jwt_auth = JWTAuthentication()
                auth_result = jwt_auth.authenticate(request)
                if auth_result:
                    request.user = auth_result[0]
            except Exception:
                logger.exception("RoleMiddleware JWT authentication failed")

        if not request.user.is_authenticated:
            return self.get_response(request)

        path = request.path
        role = getattr(request.user, 'role', '').lower()

        if path.startswith('/api/doctor/') and role != 'provider':
            return JsonResponse({'error': 'Forbidden: Doctor Access Only'}, status=403)

        if path.startswith('/api/patient/') and role != 'patient':
            return JsonResponse({'error': 'Forbidden: Patient Access Only'}, status=403)

        if path.startswith('/api/admin/') and role != 'admin':
            return JsonResponse({'error': 'Forbidden: Admin Access Only'}, status=403)

        return self.get_response(request)
