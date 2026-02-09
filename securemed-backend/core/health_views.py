"""
Health check endpoints for monitoring
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
from django.core.cache import cache
import time


class HealthCheckView(APIView):
    """Basic health check endpoint"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'timestamp': time.time()
        })


class ReadinessCheckView(APIView):
    """Readiness check - verifies all dependencies"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        checks = {
            'database': self.check_database(),
            'cache': self.check_cache(),
        }
        
        all_healthy = all(checks.values())
        
        return Response({
            'status': 'ready' if all_healthy else 'not_ready',
            'checks': checks,
            'timestamp': time.time()
        }, status=status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def check_database(self):
        """Check database connectivity"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return True
        except Exception:
            return False
    
    def check_cache(self):
        """Check cache connectivity"""
        try:
            cache.set('health_check', 'ok', 10)
            return cache.get('health_check') == 'ok'
        except Exception:
            return False


class LivenessCheckView(APIView):
    """Liveness check - verifies application is running"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'alive',
            'timestamp': time.time()
        })
