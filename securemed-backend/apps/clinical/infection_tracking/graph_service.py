"""
Neo4j graph service for hospital infection tracking.

Manages the graph representation of hospital entities (patients, doctors, rooms,
equipment) and their relationships. Provides pathfinding and cluster detection
for infection tracing.

Graph schema:
    Nodes: Patient, Doctor, Room, Equipment
    Relationships:
        (Patient)-[:VISITED {date, start_time, end_time}]->(Room)
        (Doctor)-[:WORKED_IN {date, start_time, end_time}]->(Room)
        (Patient)-[:SAW {date, start_time, end_time}]->(Doctor)
        (Patient)-[:USED_EQUIPMENT {date, start_time, end_time}]->(Equipment)
        (Equipment)-[:LOCATED_IN {date}]->(Room)
        (Room)-[:PART_OF]->(Department)
"""
import logging
from contextlib import contextmanager
from datetime import date as py_date
from datetime import datetime, timedelta
from datetime import time as py_time

from django.conf import settings
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)


class HospitalGraphService:
    """
    Singleton service managing the Neo4j graph database connection and all
    graph operations for infection tracking.

    Usage:
        graph = HospitalGraphService.get_instance()
        graph.sync_appointment(appointment_id=42)
        path = graph.find_transmission_path('PAT-001', 'PAT-002')
    """

    _instance = None

    def __init__(self):
        self._driver = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def driver(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            )
        return self._driver

    def close(self):
        if self._driver is not None:
            self._driver.close()
            self._driver = None

    @contextmanager
    def _session(self):
        session = self.driver.session()
        try:
            yield session
        finally:
            session.close()

    # ──────────────────────────────────────────────────────────────────
    # Schema setup
    # ──────────────────────────────────────────────────────────────────

    def ensure_indexes(self):
        """Create Neo4j indexes and constraints for fast lookups."""
        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Patient) REQUIRE p.patient_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Doctor) REQUIRE d.doctor_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (r:Room) REQUIRE r.room_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Equipment) REQUIRE e.equipment_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (dept:Department) REQUIRE dept.code IS UNIQUE",
        ]
        indexes = [
            "CREATE INDEX IF NOT EXISTS FOR (p:Patient) ON (p.name)",
            "CREATE INDEX IF NOT EXISTS FOR (r:Room) ON (r.room_type)",
            "CREATE INDEX IF NOT EXISTS FOR (r:Room) ON (r.risk_level)",
            "CREATE INDEX IF NOT EXISTS FOR (e:Equipment) ON (e.equipment_type)",
        ]
        with self._session() as session:
            for stmt in constraints + indexes:
                session.run(stmt)
        logger.info("Neo4j indexes and constraints ensured.")

    # ──────────────────────────────────────────────────────────────────
    # Node sync operations
    # ──────────────────────────────────────────────────────────────────

    def sync_patient(self, patient):
        """Create or update a Patient node from a Django Patient instance."""
        query = """
        MERGE (p:Patient {patient_id: $patient_id})
        SET p.name = $name,
            p.gender = $gender,
            p.blood_group = $blood_group,
            p.updated_at = datetime()
        """
        with self._session() as session:
            session.run(query, {
                'patient_id': patient.patient_id,
                'name': patient.user.get_full_name(),
                'gender': patient.gender,
                'blood_group': patient.blood_group,
            })

    def sync_doctor(self, doctor):
        """Create or update a Doctor node from a Django Doctor instance."""
        query = """
        MERGE (d:Doctor {doctor_id: $doctor_id})
        SET d.name = $name,
            d.specialization = $specialization,
            d.department_code = $department_code,
            d.updated_at = datetime()
        """
        with self._session() as session:
            session.run(query, {
                'doctor_id': doctor.doctor_id,
                'name': doctor.user.get_full_name(),
                'specialization': doctor.specialization,
                'department_code': doctor.department.code if doctor.department else '',
            })

    def sync_room(self, room):
        """Create or update a Room node and its Department relationship."""
        query = """
        MERGE (r:Room {room_id: $room_id})
        SET r.name = $name,
            r.room_type = $room_type,
            r.floor = $floor,
            r.building = $building,
            r.capacity = $capacity,
            r.risk_level = $risk_level,
            r.requires_sterilization = $requires_sterilization,
            r.updated_at = datetime()
        WITH r
        MERGE (dept:Department {code: $department_code})
        SET dept.name = $department_name
        MERGE (r)-[:PART_OF]->(dept)
        """
        with self._session() as session:
            session.run(query, {
                'room_id': room.room_id,
                'name': room.name,
                'room_type': room.room_type,
                'floor': room.floor,
                'building': room.building,
                'capacity': room.capacity,
                'risk_level': room.risk_level,
                'requires_sterilization': room.requires_sterilization,
                'department_code': room.department.code,
                'department_name': room.department.name,
            })

    def sync_equipment(self, equipment):
        """Create or update an Equipment node."""
        query = """
        MERGE (e:Equipment {equipment_id: $equipment_id})
        SET e.name = $name,
            e.equipment_type = $equipment_type,
            e.requires_sterilization = $requires_sterilization,
            e.updated_at = datetime()
        """
        params = {
            'equipment_id': equipment.equipment_id,
            'name': equipment.name,
            'equipment_type': equipment.equipment_type,
            'requires_sterilization': equipment.requires_sterilization,
        }
        with self._session() as session:
            session.run(query, params)
            # Link to current room if assigned
            if equipment.current_room:
                link_query = """
                MATCH (e:Equipment {equipment_id: $equipment_id})
                MATCH (r:Room {room_id: $room_id})
                MERGE (e)-[:LOCATED_IN]->(r)
                """
                session.run(link_query, {
                    'equipment_id': equipment.equipment_id,
                    'room_id': equipment.current_room.room_id,
                })

    # ──────────────────────────────────────────────────────────────────
    # Relationship sync
    # ──────────────────────────────────────────────────────────────────

    def sync_appointment(self, appointment):
        """
        Sync an appointment into the graph, creating:
          (Patient)-[:SAW]->(Doctor)
          (Patient)-[:VISITED]->(Room)     — if room is set
          (Doctor)-[:WORKED_IN]->(Room)    — if room is set
        """
        date_str = appointment.appointment_date.isoformat()
        start_time_str = appointment.appointment_time.isoformat()
        duration = appointment.duration or 30
        appointment_id = str(getattr(appointment, 'appointment_id', '') or getattr(appointment, 'id', ''))

        # Patient <-> Doctor relationship
        query_patient_doctor = """
        MERGE (p:Patient {patient_id: $patient_id})
        MERGE (d:Doctor {doctor_id: $doctor_id})
        MERGE (p)-[rel:SAW {appointment_id: $appointment_id}]->(d)
        SET rel.date = date($date),
            rel.start_time = time($start_time),
            rel.duration_minutes = $duration
        """
        params = {
            'patient_id': appointment.patient.patient_id,
            'doctor_id': appointment.doctor.doctor_id,
            'date': date_str,
            'start_time': start_time_str,
            'duration': duration,
            'appointment_id': appointment_id,
        }

        with self._session() as session:
            session.run(query_patient_doctor, params)

            # Room relationships (only if appointment has a room)
            if hasattr(appointment, 'room') and appointment.room:
                room_id = appointment.room.room_id

                query_patient_room = """
                MERGE (p:Patient {patient_id: $patient_id})
                MERGE (r:Room {room_id: $room_id})
                MERGE (p)-[rel:VISITED {appointment_id: $appointment_id}]->(r)
                SET rel.date = date($date),
                    rel.start_time = time($start_time),
                    rel.duration_minutes = $duration
                """
                session.run(query_patient_room, {
                    'patient_id': appointment.patient.patient_id,
                    'room_id': room_id,
                    'date': date_str,
                    'start_time': start_time_str,
                    'duration': duration,
                    'appointment_id': appointment_id,
                })

                query_doctor_room = """
                MERGE (d:Doctor {doctor_id: $doctor_id})
                MERGE (r:Room {room_id: $room_id})
                MERGE (d)-[rel:WORKED_IN {appointment_id: $appointment_id}]->(r)
                SET rel.date = date($date),
                    rel.start_time = time($start_time),
                    rel.duration_minutes = $duration
                """
                session.run(query_doctor_room, {
                    'doctor_id': appointment.doctor.doctor_id,
                    'room_id': room_id,
                    'date': date_str,
                    'start_time': start_time_str,
                    'duration': duration,
                    'appointment_id': appointment_id,
                })

    def sync_equipment_usage(self, usage_log):
        """
        Sync an equipment usage event into the graph:
          (Patient)-[:USED_EQUIPMENT]->(Equipment)
        """
        query = """
        MERGE (p:Patient {patient_id: $patient_id})
        MERGE (e:Equipment {equipment_id: $equipment_id})
        MERGE (p)-[rel:USED_EQUIPMENT {usage_log_id: $usage_log_id}]->(e)
        SET rel.date = date($date),
            rel.start_time = time($start_time),
            rel.end_time = CASE WHEN $end_time IS NULL THEN NULL ELSE time($end_time) END,
            rel.sterilized_after = $sterilized_after
        """
        with self._session() as session:
            session.run(query, {
                'patient_id': usage_log.patient.patient_id,
                'equipment_id': usage_log.equipment.equipment_id,
                'usage_log_id': usage_log.id,
                'date': usage_log.started_at.date().isoformat(),
                'start_time': usage_log.started_at.time().isoformat(),
                'end_time': usage_log.ended_at.time().isoformat() if usage_log.ended_at else None,
                'sterilized_after': usage_log.sterilized_after,
            })

    # ──────────────────────────────────────────────────────────────────
    # Pathfinding and cluster detection
    # ──────────────────────────────────────────────────────────────────

    def find_transmission_path(self, patient_a_id, patient_b_id,
                                start_date=None, end_date=None,
                                max_hops=6):
        """
        Find the shortest transmission path between two patients using
        Neo4j's built-in shortestPath algorithm.

        Args:
            patient_a_id: patient_id of the source patient
            patient_b_id: patient_id of the target patient
            start_date: filter relationships to this date range start
            end_date: filter relationships to this date range end
            max_hops: maximum relationship chain length

        Returns:
            list of dicts representing the path, or None if no path found.
            Each dict: {type: 'Patient'|'Doctor'|'Room'|'Equipment',
                        id: str, label: str, ...}
        """
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=30)).date()
        if end_date is None:
            end_date = datetime.now().date()

        query = f"""
        MATCH (a:Patient {{patient_id: $patient_a}})
        MATCH (b:Patient {{patient_id: $patient_b}})
        MATCH path = shortestPath((a)-[*..{max_hops}]-(b))
        WHERE ALL(r IN relationships(path)
                  WHERE r.date >= date($start_date)
                    AND r.date <= date($end_date))
        RETURN path,
               [n IN nodes(path) | labels(n)[0]] AS node_types,
               [n IN nodes(path) | properties(n)] AS node_props,
               [r IN relationships(path) | type(r)] AS rel_types,
               [r IN relationships(path) | properties(r)] AS rel_props,
               length(path) AS path_length
        ORDER BY path_length ASC
        LIMIT 1
        """
        with self._session() as session:
            result = session.run(query, {
                'patient_a': patient_a_id,
                'patient_b': patient_b_id,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            })
            record = result.single()
            if record is None:
                return None

            return self._serialize_path(
                record['node_types'],
                record['node_props'],
                record['rel_types'],
                record['rel_props'],
                record['path_length'],
            )

    def find_all_paths(self, patient_a_id, patient_b_id,
                       start_date=None, end_date=None,
                       max_hops=6, limit=10):
        """
        Find all paths (not just shortest) between two patients.
        Useful for comprehensive investigation.
        """
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=30)).date()
        if end_date is None:
            end_date = datetime.now().date()

        query = f"""
        MATCH (a:Patient {{patient_id: $patient_a}})
        MATCH (b:Patient {{patient_id: $patient_b}})
        MATCH path = (a)-[*..{max_hops}]-(b)
        WHERE ALL(r IN relationships(path)
                  WHERE r.date >= date($start_date)
                    AND r.date <= date($end_date))
        RETURN path,
               [n IN nodes(path) | labels(n)[0]] AS node_types,
               [n IN nodes(path) | properties(n)] AS node_props,
               [r IN relationships(path) | type(r)] AS rel_types,
               [r IN relationships(path) | properties(r)] AS rel_props,
               length(path) AS path_length
        ORDER BY path_length ASC
        LIMIT $limit
        """
        paths = []
        with self._session() as session:
            result = session.run(query, {
                'patient_a': patient_a_id,
                'patient_b': patient_b_id,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'limit': limit,
            })
            for record in result:
                paths.append(self._serialize_path(
                    record['node_types'],
                    record['node_props'],
                    record['rel_types'],
                    record['rel_props'],
                    record['path_length'],
                ))
        return paths

    def get_patient_contact_network(self, patient_id, depth=2, days=30):
        """
        Get the contact network around a patient up to `depth` hops.
        Returns all connected patients, doctors, rooms, and equipment.
        """
        start_date = (datetime.now() - timedelta(days=days)).date()

        query = f"""
        MATCH (p:Patient {{patient_id: $patient_id}})
        CALL apoc.path.subgraphAll(p, {{
            maxLevel: {depth},
            relationshipFilter: 'SAW|VISITED|WORKED_IN|USED_EQUIPMENT|LOCATED_IN'
        }})
        YIELD nodes, relationships
        RETURN
            [n IN nodes | {{type: labels(n)[0], properties: properties(n)}}] AS nodes,
            [r IN relationships | {{
                relationship: type(r),
                properties: properties(r),
                source: properties(startNode(r)),
                target: properties(endNode(r))
            }}] AS relationships
        """
        # Fallback if APOC is not installed — use variable-length pattern
        fallback_query = f"""
        MATCH path = (p:Patient {{patient_id: $patient_id}})-[*1..{depth}]-(connected)
        WHERE ALL(r IN relationships(path)
                  WHERE r.date >= date($start_date))
        WITH DISTINCT connected, labels(connected)[0] AS node_type, properties(connected) AS node_properties
        RETURN collect({{type: node_type, properties: node_properties}}) AS nodes
        """

        with self._session() as session:
            try:
                result = session.run(query, {'patient_id': patient_id})
                record = result.single()
                if record:
                    return {
                        'nodes': record['nodes'],
                        'relationships': record['relationships'],
                    }
            except Exception:
                # APOC not available, use fallback
                result = session.run(fallback_query, {
                    'patient_id': patient_id,
                    'start_date': start_date.isoformat(),
                })
                record = result.single()
                if record:
                    return {'nodes': record['nodes'], 'relationships': []}

        return {'nodes': [], 'relationships': []}

    def get_high_risk_rooms(self, days=7, limit=20):
        """
        Return rooms ranked by cross-patient traffic volume.
        Rooms with more unique patients visiting them are higher risk
        for infection transmission.
        """
        start_date = (datetime.now() - timedelta(days=days)).date()

        query = """
        MATCH (p:Patient)-[v:VISITED]->(r:Room)
        WHERE v.date >= date($start_date)
        WITH r,
             count(DISTINCT p) AS patient_count,
             count(v) AS visit_count
        OPTIONAL MATCH (d:Doctor)-[w:WORKED_IN]->(r)
        WHERE w.date >= date($start_date)
        WITH r, patient_count, visit_count,
             count(DISTINCT d) AS doctor_count
        RETURN r.room_id AS room_id,
               r.name AS room_name,
               r.room_type AS room_type,
               r.risk_level AS risk_level,
               r.building AS building,
               r.floor AS floor,
               patient_count,
               doctor_count,
               visit_count,
               toFloat(patient_count * visit_count) /
                   (CASE WHEN doctor_count > 0 THEN doctor_count ELSE 1 END)
                   AS risk_score
        ORDER BY risk_score DESC
        LIMIT $limit
        """
        rooms = []
        with self._session() as session:
            result = session.run(query, {
                'start_date': start_date.isoformat(),
                'limit': limit,
            })
            for record in result:
                rooms.append(dict(record))
        return rooms

    def get_graph_stats(self):
        """Return graph stats in the shape expected by the frontend."""
        node_counts = {}
        rel_counts = {}

        with self._session() as session:
            node_result = session.run("""
                MATCH (n)
                UNWIND labels(n) AS label
                RETURN label, count(*) AS cnt
            """)
            for record in node_result:
                node_counts[record['label']] = record['cnt']

            rel_result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) AS rel_type, count(*) AS cnt
            """)
            for record in rel_result:
                rel_counts[record['rel_type']] = record['cnt']

        total_nodes = sum(node_counts.values())
        total_relationships = sum(rel_counts.values())

        return {
            'nodes': node_counts,
            'relationships': rel_counts,
            'total_nodes': total_nodes,
            'total_relationships': total_relationships,
        }

    def get_graph_visualization_data(self, limit=200):
        """
        Return a subgraph suitable for frontend visualization.
        Returns nodes and links in a format compatible with D3.js / vis.js.
        """
        query = """
        MATCH (n)-[r]->(m)
        WITH n, r, m
        LIMIT $limit
        WITH collect(DISTINCT {
            id: coalesce(n.patient_id, n.doctor_id, n.room_id, n.equipment_id, n.code),
            label: coalesce(n.name, n.patient_id, n.doctor_id, n.room_id, n.equipment_id),
            type: labels(n)[0],
            properties: properties(n)
        }) + collect(DISTINCT {
            id: coalesce(m.patient_id, m.doctor_id, m.room_id, m.equipment_id, m.code),
            label: coalesce(m.name, m.patient_id, m.doctor_id, m.room_id, m.equipment_id),
            type: labels(m)[0],
            properties: properties(m)
        }) AS all_nodes,
        collect({
            source: coalesce(n.patient_id, n.doctor_id, n.room_id, n.equipment_id, n.code),
            target: coalesce(m.patient_id, m.doctor_id, m.room_id, m.equipment_id, m.code),
            relationship: type(r),
            properties: properties(r)
        }) AS links
        UNWIND all_nodes AS node
        WITH DISTINCT node, links
        RETURN collect(node) AS nodes, links[0..500] AS links
        """
        with self._session() as session:
            result = session.run(query, {'limit': limit})
            record = result.single()
            if record:
                nodes = [self._json_safe_value(node) for node in (record['nodes'] or [])]
                links = [self._json_safe_value(link) for link in (record['links'] or [])]
                return {
                    'nodes': nodes,
                    'links': links,
                }
        return {'nodes': [], 'links': []}

    # ──────────────────────────────────────────────────────────────────
    # Full graph rebuild
    # ──────────────────────────────────────────────────────────────────

    def clear_graph(self):
        """Delete all nodes and relationships. Used before full rebuild."""
        with self._session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        logger.info("Neo4j graph cleared.")

    def full_rebuild(self):
        """
        Wipe and rebuild the entire graph from PostgreSQL data.
        Called by the nightly Celery beat task.
        """
        from apps.clinical.infection_tracking.models import (
            Equipment,
            EquipmentUsageLog,
            Room,
        )
        from apps.scheduling.appointments.models import Appointment

        self.clear_graph()
        self.ensure_indexes()

        # Sync all rooms
        for room in Room.objects.select_related('department').filter(is_active=True):
            self.sync_room(room)
        logger.info("Rooms synced to Neo4j.")

        # Sync all equipment
        for eq in Equipment.objects.select_related('current_room', 'department').filter(is_active=True):
            self.sync_equipment(eq)
        logger.info("Equipment synced to Neo4j.")

        # Sync all patients who have appointments
        patient_ids = set()
        doctor_ids = set()

        appointments = (
            Appointment.objects
            .select_related('patient', 'patient__user', 'doctor', 'doctor__user',
                            'doctor__department', 'room', 'room__department')
            .filter(status__in=['completed', 'in_progress'])
            .order_by('appointment_date')
        )

        for appt in appointments.iterator(chunk_size=500):
            if appt.patient_id not in patient_ids:
                self.sync_patient(appt.patient)
                patient_ids.add(appt.patient_id)
            if appt.doctor_id not in doctor_ids:
                self.sync_doctor(appt.doctor)
                doctor_ids.add(appt.doctor_id)
            self.sync_appointment(appt)

        logger.info(
            "Full graph rebuild complete: %d patients, %d doctors, %d appointments.",
            len(patient_ids), len(doctor_ids), appointments.count()
        )

        # Sync equipment usage logs
        usage_count = 0
        for usage in EquipmentUsageLog.objects.select_related(
            'equipment', 'patient', 'patient__user', 'room'
        ).iterator(chunk_size=500):
            self.sync_equipment_usage(usage)
            usage_count += 1

        logger.info("Equipment usage logs synced: %d records.", usage_count)

    # ──────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _json_safe_value(value):
        """Recursively convert Neo4j temporal values into JSON-safe primitives."""
        if isinstance(value, dict):
            return {k: HospitalGraphService._json_safe_value(v) for k, v in value.items()}
        if isinstance(value, list):
            return [HospitalGraphService._json_safe_value(v) for v in value]
        if isinstance(value, tuple):
            return [HospitalGraphService._json_safe_value(v) for v in value]
        if isinstance(value, (datetime, py_date, py_time)):
            return value.isoformat()
        if hasattr(value, 'iso_format'):
            try:
                return value.iso_format()
            except Exception:
                return str(value)
        return value

    @staticmethod
    def _serialize_path(node_types, node_props, rel_types, rel_props, path_length):
        """Convert Neo4j path result into a serializable list of dicts."""
        path = []
        for i, (ntype, nprops) in enumerate(zip(node_types, node_props)):
            node_id = (
                nprops.get('patient_id') or
                nprops.get('doctor_id') or
                nprops.get('room_id') or
                nprops.get('equipment_id') or
                nprops.get('code', '')
            )
            node_entry = {
                'type': ntype,
                'id': node_id,
                'label': nprops.get('name', node_id),
            }
            # Add node-specific attributes
            if ntype == 'Room':
                node_entry['room_type'] = nprops.get('room_type', '')
                node_entry['risk_level'] = nprops.get('risk_level', '')
            elif ntype == 'Doctor':
                node_entry['specialization'] = nprops.get('specialization', '')
            elif ntype == 'Equipment':
                node_entry['equipment_type'] = nprops.get('equipment_type', '')

            path.append(node_entry)

            # Add relationship info between nodes
            if i < len(rel_types):
                rprops = rel_props[i]
                # Convert Neo4j date/time objects to strings
                rel_entry = {
                    'relationship': rel_types[i],
                    'date': str(rprops.get('date', '')),
                    'start_time': str(rprops.get('start_time', '')),
                }
                if 'duration_minutes' in rprops:
                    rel_entry['duration_minutes'] = rprops['duration_minutes']
                if 'appointment_id' in rprops:
                    rel_entry['appointment_id'] = rprops['appointment_id']
                path.append(rel_entry)

        return {
            'path': path,
            'length': path_length,
        }

    @staticmethod
    def determine_vector_type(path_data):
        """Analyze a path result to determine the vector type."""
        if path_data is None:
            return 'unknown'

        node_types = [step['type'] for step in path_data['path']
                      if 'type' in step and step['type'] != 'Patient']

        if not node_types:
            return 'unknown'

        if 'Equipment' in node_types:
            return 'shared_equipment'
        elif 'Room' in node_types and 'Doctor' not in node_types:
            return 'shared_room'
        elif 'Doctor' in node_types and 'Room' not in node_types:
            return 'shared_doctor'
        elif path_data['length'] <= 2:
            if 'Room' in node_types:
                return 'shared_room'
            return 'shared_doctor'
        else:
            return 'indirect'

    @staticmethod
    def compute_confidence(path_data, hours_between_diagnoses):
        """
        Compute a confidence score (0.0–1.0) based on:
        - Shorter paths = higher confidence
        - Closer diagnosis times = higher confidence
        """
        if path_data is None:
            return 0.0

        path_length = path_data['length']

        # Path length factor: 1 hop = 1.0, 6 hops = 0.2
        length_factor = max(0.2, 1.0 - (path_length - 1) * 0.16)

        # Time factor: 0 hours apart = 1.0, 48+ hours = 0.3
        time_factor = max(0.3, 1.0 - (hours_between_diagnoses / 72.0))

        return round(min(1.0, length_factor * time_factor), 3)
