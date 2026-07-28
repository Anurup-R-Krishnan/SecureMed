"""
Database query optimization utilities
"""
import logging
from functools import wraps

from django.conf import settings
from django.db import connection

logger = logging.getLogger('performance')


def log_queries(func):
    """Decorator to log database queries for a view"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if settings.DEBUG:
            initial_queries = len(connection.queries)
            
        result = func(*args, **kwargs)
        
        if settings.DEBUG:
            final_queries = len(connection.queries)
            query_count = final_queries - initial_queries
            
            if query_count > 10:
                logger.warning(
                    f"{func.__name__} executed {query_count} queries. "
                    f"Consider optimization."
                )
        
        return result
    return wrapper
