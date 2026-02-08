from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LabTestViewSet, LabOrderViewSet, LabResultViewSet

router = DefaultRouter()
router.register(r'tests', LabTestViewSet, basename='lab-tests')
router.register(r'orders', LabOrderViewSet, basename='lab-orders')
router.register(r'results', LabResultViewSet, basename='lab-results')

urlpatterns = [
    path('', include(router.urls)),
]
