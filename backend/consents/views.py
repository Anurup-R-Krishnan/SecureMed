from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Consent, ConsentHistory
from .serializers import ConsentSerializer


class ConsentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patient consents.
    
    - list: Returns all consents for the authenticated user
    - retrieve: Get a specific consent by ID
    - update/partial_update: Modify consent settings (auto-creates history)
    - check_department_access: Custom action to check if access is granted
    """
    serializer_class = ConsentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch', 'head', 'options']  # No POST/DELETE
    
    def get_queryset(self):
        """Return only the current user's consents."""
        return Consent.objects.filter(patient=self.request.user).select_related('patient')
    
    def perform_update(self, serializer):
        """
        Override update to automatically create ConsentHistory entries.
        This implements the version control logic.
        """
        # Get the consent instance before update
        consent = self.get_object()
        old_is_granted = consent.is_granted
        
        # Save the updated consent
        updated_consent = serializer.save()
        new_is_granted = updated_consent.is_granted
        
        # Create history entry if is_granted changed
        if old_is_granted != new_is_granted:
            action = 'GRANTED' if new_is_granted else 'REVOKED'
            ConsentHistory.objects.create(
                consent=updated_consent,
                action=action,
                actor=self.request.user
            )
    
    @action(detail=False, methods=['get'], url_path='check-access/(?P<department>[^/.]+)')
    def check_department_access(self, request, department=None):
        """
        Custom endpoint to check if user has access to a specific department.
        Usage: GET /api/consents/check-access/Cardiology/
        """
        if not department:
            return Response(
                {'error': 'Department name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            consent = Consent.objects.get(patient=request.user, department=department)
            has_access = consent.check_access()
            
            return Response({
                'department': department,
                'has_access': has_access,
                'is_granted': consent.is_granted,
                'expires_at': consent.expires_at,
                'is_expired': consent.is_expired() if consent.expires_at else False
            })
        except Consent.DoesNotExist:
            return Response(
                {
                    'department': department,
                    'has_access': False,
                    'error': 'No consent record found for this department'
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get a summary of consent status.
        Usage: GET /api/consents/summary/
        """
        consents = self.get_queryset()
        granted = consents.filter(is_granted=True).count()
        revoked = consents.filter(is_granted=False).count()
        expired = sum(1 for c in consents if c.expires_at and c.is_expired())
        
        return Response({
            'total': consents.count(),
            'granted': granted,
            'revoked': revoked,
            'expired': expired,
            'active': granted - expired
        })
