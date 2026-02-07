"""
Prescription signing API endpoint.
Requires password re-entry for digital signing.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404

from .models import Prescription


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_prescription(request, prescription_id):
    """
    Digitally sign a prescription, locking it from further edits.
    
    POST /api/medical-records/prescriptions/{id}/sign/
    
    Request body:
    {
        "password": "user_password"
    }
    
    Response (success):
    {
        "message": "Prescription signed successfully",
        "prescription_id": 1,
        "signed_at": "2026-02-07T15:30:00Z",
        "signature_hash": "abc123..."
    }
    
    Response (error):
    {
        "error": "Invalid password" | "Prescription already signed" | ...
    }
    """
    user = request.user
    
    # Check if user is a provider (doctor)
    if user.role != 'provider':
        return Response(
            {'error': 'Only healthcare providers can sign prescriptions'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get password from request
    password = request.data.get('password')
    if not password:
        return Response(
            {'error': 'Password is required to sign prescription'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Re-authenticate user with password
    authenticated_user = authenticate(
        request=request,
        email=user.email,
        password=password
    )
    
    if authenticated_user is None:
        return Response(
            {'error': 'Invalid password'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get prescription
    prescription = get_object_or_404(Prescription, id=prescription_id)
    
    # Check if already signed
    if prescription.is_signed:
        return Response(
            {'error': 'Prescription is already signed'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Sign the prescription
    try:
        prescription.sign(user)
        
        return Response({
            'message': 'Prescription signed successfully',
            'prescription_id': prescription.id,
            'signed_at': prescription.signed_at.isoformat(),
            'signature_hash': prescription.signature_hash,
            'status': prescription.status
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_prescription_signature(request, prescription_id):
    """
    Verify the integrity of a signed prescription.
    
    GET /api/medical-records/prescriptions/{id}/verify/
    
    Response:
    {
        "is_valid": true/false,
        "is_signed": true/false,
        "signed_by": "Dr. Name",
        "signed_at": "2026-02-07T15:30:00Z"
    }
    """
    prescription = get_object_or_404(Prescription, id=prescription_id)
    
    if not prescription.is_signed:
        return Response({
            'is_valid': False,
            'is_signed': False,
            'message': 'Prescription has not been signed'
        })
    
    # Verify signature hash
    current_hash = prescription.generate_signature_hash()
    is_valid = current_hash == prescription.signature_hash
    
    signed_by_name = None
    if prescription.signed_by:
        signed_by_name = f"Dr. {prescription.signed_by.last_name}"
    
    return Response({
        'is_valid': is_valid,
        'is_signed': True,
        'signed_by': signed_by_name,
        'signed_at': prescription.signed_at.isoformat() if prescription.signed_at else None,
        'message': 'Signature is valid' if is_valid else 'Signature verification failed - content may have been tampered'
    })
