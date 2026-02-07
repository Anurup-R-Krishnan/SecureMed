from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, ClinicalActionViewSet

router = DefaultRouter()
router.register(r'profiles', PatientViewSet)
router.register(r'actions', ClinicalActionViewSet, basename='clinical-actions')

urlpatterns = [
    path('', include(router.urls)),
]
