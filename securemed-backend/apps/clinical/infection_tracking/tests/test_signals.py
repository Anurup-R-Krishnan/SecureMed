from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.clinical.infection_tracking.signals import on_appointment_saved


class AppointmentGraphSignalTests(SimpleTestCase):
    def test_created_completed_appointment_enqueues_graph_sync(self):
        instance = SimpleNamespace(id=101, status='completed')

        with patch('apps.clinical.infection_tracking.tasks.sync_appointment_to_graph') as sync_task:
            on_appointment_saved(sender=None, instance=instance, created=True)

        sync_task.delay.assert_called_once_with(101)

    def test_created_scheduled_appointment_does_not_enqueue_graph_sync(self):
        instance = SimpleNamespace(id=102, status='scheduled')

        with patch('apps.clinical.infection_tracking.tasks.sync_appointment_to_graph') as sync_task:
            on_appointment_saved(sender=None, instance=instance, created=True)

        sync_task.delay.assert_not_called()

    def test_update_transition_into_sync_status_enqueues(self):
        instance = SimpleNamespace(id=103, status='in_progress', _previous_status='scheduled')

        with patch('apps.clinical.infection_tracking.tasks.sync_appointment_to_graph') as sync_task:
            on_appointment_saved(sender=None, instance=instance, created=False)

        sync_task.delay.assert_called_once_with(103)

    def test_update_within_sync_status_does_not_enqueue(self):
        instance = SimpleNamespace(
            id=104,
            status='completed',
            _previous_status='in_progress',
            _previous_sync_snapshot={
                'patient_id': 1,
                'doctor_id': 2,
                'room_id': 3,
                'appointment_date': '2026-03-06',
                'appointment_time': '10:30:00',
                'duration': 30,
            },
            patient_id=1,
            doctor_id=2,
            room_id=3,
            appointment_date='2026-03-06',
            appointment_time='10:30:00',
            duration=30,
        )

        with patch('apps.clinical.infection_tracking.tasks.sync_appointment_to_graph') as sync_task:
            on_appointment_saved(sender=None, instance=instance, created=False)

        sync_task.delay.assert_not_called()

    def test_update_outside_sync_status_does_not_enqueue(self):
        instance = SimpleNamespace(id=105, status='cancelled', _previous_status='in_progress')

        with patch('apps.clinical.infection_tracking.tasks.sync_appointment_to_graph') as sync_task:
            on_appointment_saved(sender=None, instance=instance, created=False)

        sync_task.delay.assert_not_called()

    def test_update_in_sync_status_with_graph_field_change_enqueues(self):
        instance = SimpleNamespace(
            id=106,
            status='completed',
            _previous_status='completed',
            _previous_sync_snapshot={
                'patient_id': 1,
                'doctor_id': 2,
                'room_id': 3,
                'appointment_date': '2026-03-06',
                'appointment_time': '10:30:00',
                'duration': 30,
            },
            patient_id=1,
            doctor_id=2,
            room_id=4,
            appointment_date='2026-03-06',
            appointment_time='10:30:00',
            duration=30,
        )

        with patch('apps.clinical.infection_tracking.tasks.sync_appointment_to_graph') as sync_task:
            on_appointment_saved(sender=None, instance=instance, created=False)

        sync_task.delay.assert_called_once_with(106)
