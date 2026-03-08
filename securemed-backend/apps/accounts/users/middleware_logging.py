"""
Middleware for privacy-aware access logging.

Logs authenticated user access to console (captured by Docker).
Logs include user ID, path, and method for audit purposes.
"""

import logging

logger = logging.getLogger(__name__)


class PrivacyLoggingMiddleware:
    """
    Middleware for privacy-aware access logging.
    Logs to console (captured by Docker logging).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated:
            logger.info(
                f"ACCESS: User ID {request.user.id} accessed {request.path} via {request.method}"
            )
        
        return response

