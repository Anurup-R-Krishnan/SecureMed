import logging

logger = logging.getLogger(__name__)


class PrivacyLoggingMiddleware:
    """
    Middleware for privacy-aware access logging.
    
    This middleware logs all authenticated user access to the application,
    but ONLY logs the user ID (not username or email) to protect privacy.
    
    All logs are written to privacy_audit.log for compliance tracking.
    """
    
    def __init__(self, get_response):
        """Initialize the middleware with the get_response callable."""
        self.get_response = get_response
    
    def __call__(self, request):
        """
        Process the request and log authenticated user access.
        
        Args:
            request: Django HttpRequest object
        
        Returns:
            HttpResponse object
        """
        # Get the response from the next middleware/view
        response = self.get_response(request)
        
        # Only log if user is authenticated
        if request.user.is_authenticated:
            # Log ONLY the user ID, not username or email (privacy protection)
            logger.info(
                f"ACCESS: User ID {request.user.id} accessed {request.path} via {request.method}"
            )
        
        return response
