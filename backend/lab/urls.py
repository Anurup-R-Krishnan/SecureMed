from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LabOrderViewSet, BlindedWorklistViewSet, LabResultViewSet, TestPanelViewSet

router = DefaultRouter()
router.register(r'orders', LabOrderViewSet, basename='lab-orders')
router.register(r'worklist', BlindedWorklistViewSet, basename='blinded-worklist')
router.register(r'results', LabResultViewSet, basename='lab-results')
router.register(r'panels', TestPanelViewSet, basename='test-panels')

urlpatterns = [
    path('', include(router.urls)),
]
