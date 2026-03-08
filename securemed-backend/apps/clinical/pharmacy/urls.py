from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DrugViewSet, DrugStockViewSet, DrugBatchViewSet, StockTransactionViewSet

router = DefaultRouter()
router.register(r'drugs', DrugViewSet, basename='drug')
router.register(r'stock', DrugStockViewSet, basename='stock')
router.register(r'batches', DrugBatchViewSet, basename='batch')
router.register(r'transactions', StockTransactionViewSet, basename='transaction')

urlpatterns = [
    path('inventory/', DrugStockViewSet.as_view({'get': 'list'}), name='inventory'),
    path('', include(router.urls)),
]
