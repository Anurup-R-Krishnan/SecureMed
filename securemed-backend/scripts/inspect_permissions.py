"""Introspect all URL patterns and report each view's effective permission_classes.

Read-only; does not touch the database.
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django

django.setup()

from django.urls import get_resolver, URLPattern, URLResolver

from rest_framework.permissions import AllowAny, IsAuthenticated


def view_info(view):
    """Return (kind, permission_classes or None) for a view object."""
    # DRF APIView instances / @api_view wrappers
    cls = getattr(view, 'cls', None)
    if cls is not None:
        perms = getattr(cls, 'permission_classes', None)
        return 'drf', perms
    # Plain APIView subclass instances expose permission_classes directly
    perms = getattr(view, 'permission_classes', None)
    if perms is not None:
        return 'drf', perms
    return 'plain', None


def walk(patterns, prefix=''):
    for pat in patterns:
        if isinstance(pat, URLResolver):
            yield from walk(pat.url_patterns, prefix + str(pat.pattern))
        elif isinstance(pat, URLPattern):
            name = getattr(pat, 'name', None)
            route = prefix + str(pat.pattern)
            try:
                view = pat.callback
            except Exception as exc:  # views may be lazy imports
                print(
                    f"[skip] could not resolve view for {route}: {exc}",
                    file=sys.stderr,
                )
                continue
            kind, perms = view_info(view)
            if kind == 'drf':
                if perms is None:
                    flag = 'NO_PERMISSION_CLASS -> uses DEFAULT (currently AllowAny!)'
                elif AllowAny in perms:
                    flag = 'ALLOW_ANY'
                elif IsAuthenticated in perms:
                    flag = 'authed'
                else:
                    flag = ','.join(c.__name__ for c in perms)
            else:
                flag = 'plain django view (no DRF permission model)'
            yield f'{route}\t{name}\t{flag}'


if __name__ == '__main__':
    resolver = get_resolver()
    for row in walk(resolver.url_patterns):
        print(row)
