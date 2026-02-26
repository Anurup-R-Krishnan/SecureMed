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
    AUTH_ENDPOINTS_WITH_OWN_LIMITS = {
        '/api/auth/login/',
        '/api/auth/register/',
        '/api/auth/password-reset/',
        '/api/auth/mfa/verify/',
        '/api/auth/mfa/login/',
    }
    RATE_LIMIT_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    
    def process_request(self, request):
        if request.path.startswith('/api/'):
            # Auth endpoints already use view-level ratelimit decorators.
            # Skipping here prevents stacked throttling that causes early 429s.
            if request.path in self.AUTH_ENDPOINTS_WITH_OWN_LIMITS:
                return None

            # Only throttle write-like methods. Read requests are handled
            # separately by permission checks and query constraints.
            if request.method.upper() not in self.RATE_LIMIT_METHODS:
                return None

            ip_address = self.get_client_ip(request)
            user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None
            
            # Create cache key
            cache_key = f"rate_limit:{request.method}:{request.path}:{ip_address}:{user_id}"
            
            # Get rate limit for this endpoint
            max_requests, window = self.RATE_LIMITS.get(
                request.path, 
                self.DEFAULT_RATE_LIMIT
            )
            
            # Fixed-window bucket state
            now = int(time.time())
            bucket = cache.get(cache_key)
            if not bucket or bucket.get('reset_at', 0) <= now:
                bucket = {'count': 0, 'reset_at': now + window}

            if bucket['count'] >= max_requests:
                retry_after = max(1, bucket['reset_at'] - now)
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'detail': 'Too many requests. Please try again later.',
                    'retry_after': retry_after
                }, status=429)
            
            # Increment counter
            bucket['count'] += 1
            ttl = max(1, bucket['reset_at'] - now)
            cache.set(cache_key, bucket, ttl)
        
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
