from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .services import send_email_notification, send_sms_notification

class TestEmailNotificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        recipient = request.data.get('recipient')
        subject = request.data.get('subject', 'Test Email Notification')
        message = request.data.get('message', 'This is a test email from SecureMed.')

        if not recipient:
            return Response({"error": "Recipient email is required"}, status=status.HTTP_400_BAD_REQUEST)

        success = send_email_notification(subject, message, [recipient])
        if success:
            return Response({"message": "Email sent successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to send email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestSMSNotificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get('phone_number')
        message = request.data.get('message', 'This is a test SMS from SecureMed.')

        if not phone_number:
            return Response({"error": "Phone number is required"}, status=status.HTTP_400_BAD_REQUEST)

        success = send_sms_notification(message, phone_number)
        if success:
            return Response({"message": "SMS sent successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to send SMS (check logs for details)"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
