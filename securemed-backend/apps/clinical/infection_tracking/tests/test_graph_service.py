from contextlib import nullcontext
from datetime import datetime, date, time
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.clinical.infection_tracking.graph_service import HospitalGraphService


class HospitalGraphServiceTests(SimpleTestCase):
    def test_sync_appointment_uses_event_scoped_relationship_merges(self):
        service = HospitalGraphService()
        session = MagicMock()

        appointment = SimpleNamespace(
            id=42,
            appointment_id='APT-000042',
            appointment_date=datetime(2026, 3, 6, 10, 0, 0).date(),
            appointment_time=datetime(2026, 3, 6, 10, 0, 0).time(),
            duration=30,
            patient=SimpleNamespace(patient_id='PAT-001'),
            doctor=SimpleNamespace(doctor_id='DOC-001'),
            room=SimpleNamespace(room_id='ROOM-101'),
        )

        with patch.object(service, '_session', return_value=nullcontext(session)):
            service.sync_appointment(appointment)

        queries = [call.args[0] for call in session.run.call_args_list]
        self.assertTrue(any('MERGE (p)-[rel:SAW {appointment_id: $appointment_id}]->(d)' in q for q in queries))
        self.assertTrue(any('MERGE (p)-[rel:VISITED {appointment_id: $appointment_id}]->(r)' in q for q in queries))
        self.assertTrue(any('MERGE (d)-[rel:WORKED_IN {appointment_id: $appointment_id}]->(r)' in q for q in queries))

        params = [call.args[1] for call in session.run.call_args_list if len(call.args) > 1]
        self.assertTrue(any(p.get('appointment_id') == 'APT-000042' for p in params))

    def test_sync_equipment_usage_uses_usage_log_identity(self):
        service = HospitalGraphService()
        session = MagicMock()

        usage_log = SimpleNamespace(
            id=77,
            patient=SimpleNamespace(patient_id='PAT-101'),
            equipment=SimpleNamespace(equipment_id='EQ-501'),
            started_at=datetime(2026, 3, 6, 9, 30, 0),
            ended_at=None,
            sterilized_after=True,
        )

        with patch.object(service, '_session', return_value=nullcontext(session)):
            service.sync_equipment_usage(usage_log)

        query = session.run.call_args.args[0]
        params = session.run.call_args.args[1]
        self.assertIn('MERGE (p)-[rel:USED_EQUIPMENT {usage_log_id: $usage_log_id}]->(e)', query)
        self.assertEqual(params['usage_log_id'], 77)
        self.assertIsNone(params['end_time'])

    def test_graph_visualization_returns_frontend_contract_keys(self):
        service = HospitalGraphService()
        session = MagicMock()
        session.run.return_value.single.return_value = {
            'nodes': [{
                'id': 'PAT-001',
                'label': 'PAT-001',
                'type': 'Patient',
                'properties': {'name': 'Patient 1'},
            }],
            'links': [{
                'source': 'PAT-001',
                'target': 'DOC-001',
                'relationship': 'SAW',
                'properties': {'appointment_id': 'APT-000001'},
            }],
        }

        with patch.object(service, '_session', return_value=nullcontext(session)):
            data = service.get_graph_visualization_data(limit=10)

        self.assertIn('properties', data['nodes'][0])
        self.assertIn('relationship', data['links'][0])
        self.assertIn('properties', data['links'][0])

    def test_contact_network_query_uses_contract_keys(self):
        service = HospitalGraphService()
        session = MagicMock()
        session.run.return_value.single.return_value = {
            'nodes': [],
            'relationships': [],
        }

        with patch.object(service, '_session', return_value=nullcontext(session)):
            service.get_patient_contact_network(patient_id='PAT-001', depth=2, days=30)

        primary_query = session.run.call_args_list[0].args[0]
        self.assertIn('properties: properties(n)', primary_query)
        self.assertIn('relationship: type(r)', primary_query)

    def test_find_transmission_path_with_real_neo4j(self):
        service = HospitalGraphService.get_instance()
        try:
            with service._session() as session:
                session.run("RETURN 1")
        except Exception as exc:
            self.skipTest(f"Neo4j unavailable in test environment: {exc}")

        try:
            service.clear_graph()

            doctor = SimpleNamespace(doctor_id='DOC-E2E-001')
            room = SimpleNamespace(room_id='ROOM-E2E-001')

            appointment_one = SimpleNamespace(
                id=1001,
                appointment_id='APT-E2E-001',
                appointment_date=date.today(),
                appointment_time=time(9, 0, 0),
                duration=30,
                patient=SimpleNamespace(patient_id='PAT-E2E-001'),
                doctor=doctor,
                room=room,
            )
            appointment_two = SimpleNamespace(
                id=1002,
                appointment_id='APT-E2E-002',
                appointment_date=date.today(),
                appointment_time=time(9, 30, 0),
                duration=30,
                patient=SimpleNamespace(patient_id='PAT-E2E-002'),
                doctor=doctor,
                room=room,
            )

            service.sync_appointment(appointment_one)
            service.sync_appointment(appointment_two)

            path = service.find_transmission_path(
                'PAT-E2E-001',
                'PAT-E2E-002',
                start_date=date.today(),
                end_date=date.today(),
                max_hops=6,
            )
            self.assertIsNotNone(path)
            self.assertGreater(path['length'], 0)
            self.assertTrue(any(step.get('id') == 'PAT-E2E-001' for step in path['path'] if isinstance(step, dict)))
            self.assertTrue(any(step.get('id') == 'PAT-E2E-002' for step in path['path'] if isinstance(step, dict)))
        finally:
            try:
                service.clear_graph()
            except Exception:
                pass
