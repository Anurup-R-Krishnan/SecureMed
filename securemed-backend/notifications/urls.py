from django.urls import path
from .views import TestEmailNotificationView, TestSMSNotificationView

urlpatterns = [
    path('test/email/', TestEmailNotificationView.as_view(), name='test-email-notification'),
    path('test/sms/', TestSMSNotificationView.as_view(), name='test-sms-notification'),
]
