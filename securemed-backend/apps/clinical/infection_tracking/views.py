import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q

from .models import (
    Room, Equipment, EquipmentUsageLog,
    InfectionReport, InfectionTrace, RoomRiskScore,
)
from .serializers import (
    RoomSerializer, EquipmentSerializer, EquipmentUsageLogSerializer,
    InfectionReportSerializer, InfectionTraceSerializer,
    RoomRiskScoreSerializer,
)
from apps.accounts.users.permissions import IsDoctor

logger = logging.getLogger(__name__)


def _parse_int_query_param(raw_value, *, default, field, minimum=None, maximum=None):
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid '{field}' value; expected integer.") from exc
    if minimum is not None and value < minimum:
        raise ValueError(f"Invalid '{field}' value; minimum is {minimum}.")
    if maximum is not None and value > maximum:
        raise ValueError(f"Invalid '{field}' value; maximum is {maximum}.")
    return value


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsDoctorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('doctor', 'admin')
        )


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get_queryset(self):
        qs = Room.objects.select_related('department').all()
        # Filter by department
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department_id=dept)
        # Filter by building
        building = self.request.query_params.get('building')
        if building:
            qs = qs.filter(building=building)
        # Filter by floor
        floor = self.request.query_params.get('floor')
        if floor:
            qs = qs.filter(floor=floor)
        # Filter by room type
        room_type = self.request.query_params.get('room_type')
        if room_type:
            qs = qs.filter(room_type=room_type)
        # Filter by risk level
        risk_level = self.request.query_params.get('risk_level')
        if risk_level:
            qs = qs.filter(risk_level=risk_level)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()


class EquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get_queryset(self):
        qs = Equipment.objects.select_related('current_room', 'department').all()
        equipment_type = self.request.query_params.get('equipment_type')
        if equipment_type:
            qs = qs.filter(equipment_type=equipment_type)
        room = self.request.query_params.get('room')
        if room:
            qs = qs.filter(current_room_id=room)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()


class EquipmentUsageLogViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentUsageLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get_queryset(self):
        return (
            EquipmentUsageLog.objects
            .select_related('equipment', 'patient', 'room', 'used_by')
            .all()
        )


class InfectionReportViewSet(viewsets.ModelViewSet):
    serializer_class = InfectionReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get_queryset(self):
        qs = (
            InfectionReport.objects
            .select_related('patient', 'patient__user', 'reported_by')
            .all()
        )
        # Filter by infection name
        infection = self.request.query_params.get('infection_name')
        if infection:
            qs = qs.filter(infection_name__iexact=infection)
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity)
        # Filter by patient
        patient = self.request.query_params.get('patient')
        if patient:
            qs = qs.filter(patient_id=patient)
        return qs

    @action(detail=True, methods=['get'])
    def traces(self, request, pk=None):
        """Get all infection traces linked to this report."""
        report = self.get_object()
        traces = InfectionTrace.objects.filter(
            Q(source_report=report) | Q(target_report=report)
        ).select_related(
            'source_report__patient__user',
            'target_report__patient__user',
            'investigated_by',
        )
        serializer = InfectionTraceSerializer(traces, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def contact_network(self, request, pk=None):
        """Get the contact network around the infected patient."""
        report = self.get_object()
        try:
            depth = _parse_int_query_param(
                request.query_params.get('depth'),
                default=2,
                field='depth',
                minimum=1,
                maximum=4,
            )
            days = _parse_int_query_param(
                request.query_params.get('days'),
                default=30,
                field='days',
                minimum=1,
                maximum=365,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        from .graph_service import HospitalGraphService
        graph = HospitalGraphService.get_instance()
        network = graph.get_patient_contact_network(
            report.patient.patient_id,
            depth=depth,
            days=days,
        )
        return Response(network)


class InfectionTraceViewSet(viewsets.ModelViewSet):
    serializer_class = InfectionTraceSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']  # read-only + status updates

    def get_queryset(self):
        qs = (
            InfectionTrace.objects
            .select_related(
                'source_report__patient__user',
                'target_report__patient__user',
                'investigated_by',
            )
            .all()
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        infection = self.request.query_params.get('infection_name')
        if infection:
            qs = qs.filter(infection_name__iexact=infection)
        vector_type = self.request.query_params.get('vector_type')
        if vector_type:
            qs = qs.filter(vector_type=vector_type)
        return qs

    @action(detail=False, methods=['get'])
    def active_clusters(self, request):
        """Get all currently active (detected/investigating) infection clusters."""
        traces = self.get_queryset().filter(
            status__in=['detected', 'investigating']
        ).order_by('-confidence_score')
        serializer = self.get_serializer(traces, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def high_risk_rooms(self, request):
        """Get rooms with highest risk scores."""
        try:
            days = _parse_int_query_param(
                request.query_params.get('days'),
                default=7,
                field='days',
                minimum=1,
                maximum=365,
            )
            limit = _parse_int_query_param(
                request.query_params.get('limit'),
                default=20,
                field='limit',
                minimum=1,
                maximum=200,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        from .graph_service import HospitalGraphService
        graph = HospitalGraphService.get_instance()
        rooms = graph.get_high_risk_rooms(days=days, limit=limit)
        return Response(rooms)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update investigation status of a trace."""
        trace = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(InfectionTrace.STATUS_CHOICES):
            return Response(
                {'error': f'Invalid status. Choose from: {list(dict(InfectionTrace.STATUS_CHOICES).keys())}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        trace.status = new_status
        trace.investigated_by = request.user
        if 'investigation_notes' in request.data:
            trace.investigation_notes = request.data['investigation_notes']
        trace.save()
        return Response(InfectionTraceSerializer(trace).data)


class RoomRiskScoreViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RoomRiskScoreSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get_queryset(self):
        qs = RoomRiskScore.objects.select_related('room').all()
        room = self.request.query_params.get('room')
        if room:
            qs = qs.filter(room_id=room)
        return qs


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsDoctorOrAdmin])
def graph_stats(request):
    """Return overall graph database statistics."""
    from .graph_service import HospitalGraphService
    graph = HospitalGraphService.get_instance()
    stats = graph.get_graph_stats()
    return Response(stats)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsDoctorOrAdmin])
def graph_visualization(request):
    """Return graph data for frontend visualization (D3.js / vis.js format)."""
    try:
        limit = _parse_int_query_param(
            request.query_params.get('limit'),
            default=200,
            field='limit',
            minimum=1,
            maximum=500,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    from .graph_service import HospitalGraphService
    graph = HospitalGraphService.get_instance()
    data = graph.get_graph_visualization_data(limit=limit)
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def trigger_rebuild(request):
    """Admin endpoint to trigger a full graph rebuild."""
    from .tasks import rebuild_graph
    rebuild_graph.delay()
    return Response({'status': 'Graph rebuild task queued.'}, status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def trigger_risk_computation(request):
    """Admin endpoint to trigger room risk score computation."""
    from .tasks import compute_room_risk_scores
    compute_room_risk_scores.delay()
    return Response({'status': 'Risk computation task queued.'}, status=status.HTTP_202_ACCEPTED)
