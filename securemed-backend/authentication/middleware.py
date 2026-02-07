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
                    # Manually set the user on the request
                    request.user = auth_result[0]
            except Exception:
                # Token invalid or missing; proceed as Anonymous
                pass

        # 1. Skip checks if user is still not logged in (Anonymous)
        if not request.user.is_authenticated:
            return self.get_response(request)

        path = request.path
        # Safety: handle missing role, default to empty string
        role = getattr(request.user, 'role', '').lower()

        # DEBUGGING LOGS
        print(f"🛑 MIDDLEWARE CHECK -> User: {request.user.email} | Role: '{role}' | Path: '{path}'")

        # 2. Define Forbidden Areas
        # Doctor Area (Only 'provider' allowed)
        if path.startswith('/api/doctor/') and role != 'provider':
            print("   ❌ BLOCKED: Non-provider tried to access Doctor area.")
            return JsonResponse({'error': 'Forbidden: Doctor Access Only'}, status=403)

        # Patient Area (Only 'patient' allowed)
        if path.startswith('/api/patient/') and role != 'patient':
            print("   ❌ BLOCKED: Non-patient tried to access Patient area.")
            return JsonResponse({'error': 'Forbidden: Patient Access Only'}, status=403)

        # Admin Area (Only 'admin' allowed)
        if path.startswith('/api/admin/') and role != 'admin':
            print("   ❌ BLOCKED: Non-admin tried to access Admin area.")
            return JsonResponse({'error': 'Forbidden: Admin Access Only'}, status=403)

        # 3. Allow Access
        print("   ✅ ALLOWED: Access granted.")
        return self.get_response(request)
