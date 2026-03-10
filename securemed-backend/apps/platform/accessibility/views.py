from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import IntentMatcher
import logging

logger = logging.getLogger(__name__)

class VoiceIntentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({"error": "No text provided"}, status=status.HTTP_400_BAD_REQUEST)

        matcher = IntentMatcher(request.user)
        result = matcher.process(text)

        return Response(result)
