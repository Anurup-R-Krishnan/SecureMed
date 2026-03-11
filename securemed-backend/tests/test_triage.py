"""
Unit tests for the AI Triage System.

Endpoints under test (all prefixed with /api/telemedicine/):
  POST  triage/chat/                 — ai_triage_chat
  POST  triage/submit/               — submit_triage_request
  GET   triage/inbox/                — doctor_triage_inbox
  POST  triage/approve/              — approve_triage_request
  GET   triage/status/<triage_id>/   — triage_status_check
"""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.clinical.telemedicine.models import TriageRequest

User = get_user_model()

# Module path for the Gemini client used inside the views module
_VIEWS_MODULE = "apps.clinical.telemedicine.views"


class TriageTestBase(TestCase):
    """Shared fixtures: a patient and a doctor user, plus a fresh APIClient."""

    def setUp(self):
        self.client = APIClient()

        self.patient = User.objects.create_user(
            username="test_patient",
            email="patient@test.com",
            password="TestPass123!",
            role="patient",
        )
        self.doctor = User.objects.create_user(
            username="test_doctor",
            email="doctor@test.com",
            password="TestPass123!",
            role="doctor",
        )

    # ── helpers ───────────────────────────────────────────────────────────────

    def _auth_as(self, user):
        self.client.force_authenticate(user=user)

    def _make_triage(self, status_value="PENDING"):
        return TriageRequest.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            ai_summary="Patient has a headache.",
            status=status_value,
        )


# ─────────────────────────────────────────────────────────────────────────────
# 1. ai_triage_chat
# ─────────────────────────────────────────────────────────────────────────────

class AiTriageChatTests(TriageTestBase):
    URL = "/api/telemedicine/triage/chat/"

    def test_ai_triage_chat_success(self):
        """Mock Gemini and verify 200 OK with the AI reply text."""
        mock_response = MagicMock()
        mock_response.text = "It sounds like tension headaches. Have you been stressed?"

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response

        self._auth_as(self.patient)

        with patch(f"{_VIEWS_MODULE}._genai_client", mock_client), \
             patch(f"{_VIEWS_MODULE}.GEMINI_AVAILABLE", True):
            response = self.client.post(
                self.URL,
                {"message": "I have a severe headache."},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("reply", response.data)
        self.assertEqual(response.data["reply"], mock_response.text)

    def test_ai_triage_chat_missing_message(self):
        """Omitting 'message' should return 400 Bad Request."""
        self._auth_as(self.patient)

        with patch(f"{_VIEWS_MODULE}.GEMINI_AVAILABLE", True):
            response = self.client.post(self.URL, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_ai_triage_chat_unauthenticated(self):
        """Unauthenticated requests must be rejected."""
        response = self.client.post(
            self.URL, {"message": "Hello"}, format="json"
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ai_triage_chat_gemini_unavailable(self):
        """If Gemini is not configured, the view must return 503."""
        self._auth_as(self.patient)

        with patch(f"{_VIEWS_MODULE}.GEMINI_AVAILABLE", False):
            response = self.client.post(
                self.URL, {"message": "Test"}, format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


# ─────────────────────────────────────────────────────────────────────────────
# 2. submit_triage_request
# ─────────────────────────────────────────────────────────────────────────────

class SubmitTriageRequestTests(TriageTestBase):
    URL = "/api/telemedicine/triage/submit/"

    def test_submit_triage_request(self):
        """Patient can successfully submit a triage request; DB record created."""
        self._auth_as(self.patient)
        payload = {
            "doctor_id": self.doctor.id,
            "ai_summary": "Severe headache for 3 days.",
        }

        response = self.client.post(self.URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("triage_id", response.data)
        self.assertEqual(response.data["status"], "PENDING")

        # Verify DB record
        triage = TriageRequest.objects.get(id=response.data["triage_id"])
        self.assertEqual(triage.patient, self.patient)
        self.assertEqual(triage.doctor, self.doctor)
        self.assertEqual(triage.status, "PENDING")

    def test_submit_triage_missing_doctor_id(self):
        """Omitting doctor_id must return 400."""
        self._auth_as(self.patient)
        response = self.client.post(
            self.URL, {"ai_summary": "Some summary"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_triage_missing_ai_summary(self):
        """Omitting ai_summary must return 400."""
        self._auth_as(self.patient)
        response = self.client.post(
            self.URL, {"doctor_id": self.doctor.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# 3. doctor_triage_inbox
# ─────────────────────────────────────────────────────────────────────────────

class DoctorTriageInboxTests(TriageTestBase):
    URL = "/api/telemedicine/triage/inbox/"

    def test_doctor_triage_inbox(self):
        """Doctor can fetch their own PENDING triage requests."""
        self._make_triage(status_value="PENDING")
        self._make_triage(status_value="APPROVED")  # should not appear

        self._auth_as(self.doctor)
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Only the PENDING one should be returned
        self.assertEqual(len(response.data), 1)
        self.assertIn("triage_id", response.data[0])
        self.assertIn("ai_summary", response.data[0])

    def test_patient_cannot_access_inbox(self):
        """A patient must receive 403 when trying to access the doctor inbox."""
        self._auth_as(self.patient)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_inbox_only_shows_own_requests(self):
        """Doctor only sees requests addressed to them, not other doctors."""
        other_doctor = User.objects.create_user(
            username="other_doctor",
            email="other_doctor@test.com",
            password="TestPass123!",
            role="doctor",
        )
        # Triage for the other doctor — should not appear in self.doctor's inbox
        TriageRequest.objects.create(
            patient=self.patient,
            doctor=other_doctor,
            ai_summary="Other doctor's request.",
            status="PENDING",
        )

        self._auth_as(self.doctor)
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


# ─────────────────────────────────────────────────────────────────────────────
# 4. approve_triage_request
# ─────────────────────────────────────────────────────────────────────────────

class ApproveTriageRequestTests(TriageTestBase):
    URL = "/api/telemedicine/triage/approve/"

    def test_approve_triage_request(self):
        """Doctor can approve a triage request; DB status updates to APPROVED."""
        triage = self._make_triage()
        self._auth_as(self.doctor)

        response = self.client.post(
            self.URL,
            {"triage_id": triage.id, "action": "APPROVED"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "APPROVED")

        triage.refresh_from_db()
        self.assertEqual(triage.status, "APPROVED")

    def test_decline_triage_request(self):
        """Doctor can decline a triage request; DB status updates to DECLINED."""
        triage = self._make_triage()
        self._auth_as(self.doctor)

        response = self.client.post(
            self.URL,
            {"triage_id": triage.id, "action": "DECLINED"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "DECLINED")

        triage.refresh_from_db()
        self.assertEqual(triage.status, "DECLINED")

    def test_patient_cannot_approve(self):
        """A patient must receive 403 when trying to approve."""
        triage = self._make_triage()
        self._auth_as(self.patient)

        response = self.client.post(
            self.URL,
            {"triage_id": triage.id, "action": "APPROVED"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action_rejected(self):
        """An action value other than APPROVED/DECLINED must return 400."""
        triage = self._make_triage()
        self._auth_as(self.doctor)

        response = self.client.post(
            self.URL,
            {"triage_id": triage.id, "action": "MAYBE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_approve_another_doctors_request(self):
        """A doctor cannot approve a triage request addressed to a different doctor."""
        other_doctor = User.objects.create_user(
            username="other_doctor2",
            email="other_doctor2@test.com",
            password="TestPass123!",
            role="doctor",
        )
        triage = self._make_triage()  # assigned to self.doctor
        self._auth_as(other_doctor)

        response = self.client.post(
            self.URL,
            {"triage_id": triage.id, "action": "APPROVED"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────────────────────────────────────
# 5. triage_status_check
# ─────────────────────────────────────────────────────────────────────────────

class TriageStatusCheckTests(TriageTestBase):

    def _url(self, triage_id):
        return f"/api/telemedicine/triage/status/{triage_id}/"

    def test_triage_status_check_pending(self):
        """Patient can fetch the PENDING status of their triage request."""
        triage = self._make_triage(status_value="PENDING")
        self._auth_as(self.patient)

        response = self.client.get(self._url(triage.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["triage_id"], triage.id)
        self.assertEqual(response.data["status"], "PENDING")

    def test_triage_status_check_approved(self):
        """After approval, patient can see APPROVED status."""
        triage = self._make_triage(status_value="APPROVED")
        self._auth_as(self.patient)

        response = self.client.get(self._url(triage.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "APPROVED")

    def test_patient_cannot_check_another_patients_status(self):
        """Patient cannot poll a triage request that belongs to someone else."""
        other_patient = User.objects.create_user(
            username="other_patient",
            email="other_patient@test.com",
            password="TestPass123!",
            role="patient",
        )
        triage = self._make_triage()  # owned by self.patient
        self._auth_as(other_patient)

        response = self.client.get(self._url(triage.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_status_check_nonexistent_triage(self):
        """A non-existent triage_id must return 404."""
        self._auth_as(self.patient)
        response = self.client.get(self._url(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
