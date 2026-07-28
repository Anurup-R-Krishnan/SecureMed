from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LabNotificationViewSet,
    LabOrderViewSet,
    LabResultViewSet,
    LabTestViewSet,
    LabWorklistViewSet,
)

router = DefaultRouter()
router.register(r'tests', LabTestViewSet, basename='lab-tests')
router.register(r'orders', LabOrderViewSet, basename='lab-orders')
router.register(r'results', LabResultViewSet, basename='lab-results')
router.register(r'worklist', LabWorklistViewSet, basename='lab-worklist')
router.register(r'notifications', LabNotificationViewSet, basename='lab-notifications')

urlpatterns = [
    path('', include(router.urls)),
]
