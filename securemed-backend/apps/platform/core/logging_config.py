"""
Centralized logging configuration for production
"""
import logging
import sys


def setup_production_logging():
    """Configure structured logging for production"""
    
    # Root logger configuration
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Performance logger
    performance_logger = logging.getLogger('performance')
    performance_logger.setLevel(logging.WARNING)
    
    # Security logger
    security_logger = logging.getLogger('security')
    security_logger.setLevel(logging.INFO)
    
    # Disable debug logging in production
    logging.getLogger('django.db.backends').setLevel(logging.WARNING)
    logging.getLogger('django.request').setLevel(logging.WARNING)
