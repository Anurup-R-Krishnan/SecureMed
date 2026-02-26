from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'rooms', views.RoomViewSet, basename='room')
router.register(r'equipment', views.EquipmentViewSet, basename='equipment')
router.register(r'equipment-usage', views.EquipmentUsageLogViewSet, basename='equipment-usage')
router.register(r'reports', views.InfectionReportViewSet, basename='infection-report')
router.register(r'traces', views.InfectionTraceViewSet, basename='infection-trace')
router.register(r'risk-scores', views.RoomRiskScoreViewSet, basename='room-risk-score')

urlpatterns = [
    path('', include(router.urls)),
    # Graph operations
    path('graph/stats/', views.graph_stats, name='graph-stats'),
    path('graph/visualization/', views.graph_visualization, name='graph-visualization'),
    path('graph/rebuild/', views.trigger_rebuild, name='graph-rebuild'),
    path('graph/compute-risk/', views.trigger_risk_computation, name='graph-compute-risk'),
]
