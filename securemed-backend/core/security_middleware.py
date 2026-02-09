"""
Security middleware for SecureMed
Implements rate limiting, security headers, and request validation
"""
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.conf import settings
import time


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses"""
    
    def process_response(self, request, response):
        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:*; "
            "frame-ancestors 'none';"
        )
        
        # Strict Transport Security (HTTPS only)
        if settings.SECURE_SSL:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # XSS Protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response['Permissions-Policy'] = (
            'geolocation=(), '
            'microphone=(), '
            'camera=(), '
            'payment=(), '
            'usb=(), '
            'magnetometer=(), '
            'gyroscope=(), '
            'accelerometer=()'
        )
        
        return response


class RateLimitMiddleware(MiddlewareMixin):
    """Rate limiting for API endpoints"""
    
    RATE_LIMITS = {
        '/api/auth/login/': (5, 300),  # 5 attempts per 5 minutes
        '/api/auth/register/': (3, 3600),  # 3 attempts per hour
        '/api/auth/password-reset/': (3, 3600),  # 3 attempts per hour
        '/api/auth/mfa/verify/': (5, 300),  # 5 attempts per 5 minutes
    }
    
    DEFAULT_RATE_LIMIT = (100, 60)  # 100 requests per minute for other endpoints
    
    def process_request(self, request):
        if request.path.startswith('/api/'):
            ip_address = self.get_client_ip(request)
            user_id = request.user.id if request.user.is_authenticated else None
            
            # Create cache key
            cache_key = f"rate_limit:{request.path}:{ip_address}:{user_id}"
            
            # Get rate limit for this endpoint
            max_requests, window = self.RATE_LIMITS.get(
                request.path, 
                self.DEFAULT_RATE_LIMIT
            )
            
            # Get current request count
            request_count = cache.get(cache_key, 0)
            
            if request_count >= max_requests:
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'detail': f'Too many requests. Please try again later.',
                    'retry_after': window
                }, status=429)
            
            # Increment counter
            cache.set(cache_key, request_count + 1, window)
        
        return None
    
    def get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log all API requests with timing"""
    
    def process_request(self, request):
        request._start_time = time.time()
        return None
    
    def process_response(self, request, response):
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            # Log slow requests (> 1 second)
            if duration > 1.0 and request.path.startswith('/api/'):
                import logging
                logger = logging.getLogger('performance')
                logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s - Status: {response.status_code}"
                )
        
        return response
