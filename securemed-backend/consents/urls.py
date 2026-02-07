from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConsentViewSet

# Create a router and register our viewset
router = DefaultRouter()
router.register(r'', ConsentViewSet, basename='consent')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
