"""Tests for platform core middleware and utilities."""
from django.test import RequestFactory, TestCase

from apps.platform.core.security_middleware import CollapseDuplicateSlashMiddleware


class CollapseDuplicateSlashMiddlewareTests(TestCase):
    """Repeated slashes in the request path must collapse before resolution.

    Proxies and rewrite rules can produce doubled trailing slashes (for
    example /api/auth/login//) which Django's URLconf would otherwise reject
    with 404.
    """

    def test_double_trailing_slash_resolves(self):
        response = self.client.post('/api/auth/login//', data={}, content_type='application/json')
        # Reaches the view (400 = validation error, not 404 route miss).
        self.assertEqual(response.status_code, 400)

    def test_triple_trailing_slash_resolves(self):
        response = self.client.post('/api/auth/login///', data={}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_single_slash_unchanged(self):
        response = self.client.post('/api/auth/login/', data={}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_collapses_internal_duplicate_slashes(self):
        response = self.client.post('/api//auth/login/', data={}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_query_string_preserved_after_collapse(self):
        response = self.client.get('/api/health/ready//?probe=1')
        # Readiness may vary (DB/cache state), but the route must resolve and
        # the query string must survive the path collapse intact.
        self.assertIn(response.status_code, (200, 503))
        self.assertEqual(response.wsgi_request.GET['probe'], '1')
        self.assertEqual(response.wsgi_request.path, '/api/health/ready/')

    def test_middleware_skips_clean_paths(self):
        request = self._make_request('/api/health/ready/')
        middleware = CollapseDuplicateSlashMiddleware(lambda req: None)
        middleware.process_request(request)
        self.assertEqual(request.path_info, '/api/health/ready/')

    def test_middleware_collapses_clean_paths(self):
        request = self._make_request('/api/auth/login//')
        middleware = CollapseDuplicateSlashMiddleware(lambda req: None)
        middleware.process_request(request)
        self.assertEqual(request.path_info, '/api/auth/login/')
        self.assertEqual(request.path, '/api/auth/login/')
        self.assertEqual(request.environ['PATH_INFO'], '/api/auth/login/')

    def _make_request(self, path):
        factory = RequestFactory()
        return factory.get(path)
