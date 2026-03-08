"""
Management command to set up the hospital room and equipment infrastructure.

Creates departments, rooms across buildings/floors, and shared equipment.
Run once during initial deployment or when expanding the hospital layout.

Usage:
    python manage.py setup_hospital
    python manage.py setup_hospital --clear  # wipe and re-create
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.scheduling.availability.models import Department
from apps.clinical.infection_tracking.models import Room, Equipment


# Hospital layout definition — extend this when adding new wings/buildings
HOSPITAL_LAYOUT = {
    'buildings': {
        'Main Building': {
            'floors': {
                1: {
                    'departments': {
                        'Emergency Medicine': {
                            'code': 'ER',
                            'rooms': [
                                {'type': 'emergency', 'prefix': 'ER-BAY', 'count': 12, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'procedure', 'prefix': 'ER-PROC', 'count': 4, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'imaging', 'prefix': 'ER-IMG', 'count': 2, 'capacity': 1, 'risk': 'medium', 'sterile': True},
                                {'type': 'isolation', 'prefix': 'ER-ISO', 'count': 3, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                            ],
                        },
                        'Radiology': {
                            'code': 'RAD',
                            'rooms': [
                                {'type': 'radiology', 'prefix': 'RAD-XRAY', 'count': 4, 'capacity': 1, 'risk': 'medium', 'sterile': True},
                                {'type': 'imaging', 'prefix': 'RAD-MRI', 'count': 3, 'capacity': 1, 'risk': 'medium', 'sterile': True},
                                {'type': 'imaging', 'prefix': 'RAD-CT', 'count': 3, 'capacity': 1, 'risk': 'medium', 'sterile': True},
                                {'type': 'imaging', 'prefix': 'RAD-USG', 'count': 4, 'capacity': 1, 'risk': 'low', 'sterile': False},
                            ],
                        },
                        'Pathology & Lab': {
                            'code': 'LAB',
                            'rooms': [
                                {'type': 'lab', 'prefix': 'LAB-MAIN', 'count': 3, 'capacity': 2, 'risk': 'high', 'sterile': True},
                                {'type': 'blood_bank', 'prefix': 'LAB-BB', 'count': 1, 'capacity': 2, 'risk': 'high', 'sterile': True},
                                {'type': 'lab', 'prefix': 'LAB-MICRO', 'count': 2, 'capacity': 2, 'risk': 'critical', 'sterile': True},
                            ],
                        },
                        'Pharmacy': {
                            'code': 'PHRM',
                            'rooms': [
                                {'type': 'pharmacy', 'prefix': 'PHRM', 'count': 3, 'capacity': 3, 'risk': 'low', 'sterile': False},
                            ],
                        },
                    },
                },
                2: {
                    'departments': {
                        'General Medicine': {
                            'code': 'MED',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'MED-EXAM', 'count': 10, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'ward', 'prefix': 'MED-WARD', 'count': 6, 'capacity': 6, 'risk': 'medium', 'sterile': False},
                                {'type': 'isolation', 'prefix': 'MED-ISO', 'count': 4, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'procedure', 'prefix': 'MED-PROC', 'count': 3, 'capacity': 1, 'risk': 'high', 'sterile': True},
                            ],
                        },
                        'Pulmonology': {
                            'code': 'PULM',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'PULM-EXAM', 'count': 6, 'capacity': 1, 'risk': 'high', 'sterile': False},
                                {'type': 'procedure', 'prefix': 'PULM-PROC', 'count': 2, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'ward', 'prefix': 'PULM-WARD', 'count': 3, 'capacity': 4, 'risk': 'high', 'sterile': False},
                            ],
                        },
                    },
                },
                3: {
                    'departments': {
                        'Cardiology': {
                            'code': 'CARD',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'CARD-EXAM', 'count': 8, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'cathlab', 'prefix': 'CARD-CATH', 'count': 3, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'icu', 'prefix': 'CARD-CCU', 'count': 8, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'ward', 'prefix': 'CARD-WARD', 'count': 4, 'capacity': 4, 'risk': 'medium', 'sterile': False},
                            ],
                        },
                        'Neurology': {
                            'code': 'NEUR',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'NEUR-EXAM', 'count': 6, 'capacity': 1, 'risk': 'low', 'sterile': False},
                                {'type': 'procedure', 'prefix': 'NEUR-EEG', 'count': 2, 'capacity': 1, 'risk': 'low', 'sterile': False},
                                {'type': 'ward', 'prefix': 'NEUR-WARD', 'count': 3, 'capacity': 4, 'risk': 'medium', 'sterile': False},
                            ],
                        },
                    },
                },
                4: {
                    'departments': {
                        'Orthopedics': {
                            'code': 'ORTH',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'ORTH-EXAM', 'count': 6, 'capacity': 1, 'risk': 'low', 'sterile': False},
                                {'type': 'procedure', 'prefix': 'ORTH-PROC', 'count': 3, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'ward', 'prefix': 'ORTH-WARD', 'count': 4, 'capacity': 4, 'risk': 'medium', 'sterile': False},
                                {'type': 'rehab', 'prefix': 'ORTH-REHAB', 'count': 3, 'capacity': 2, 'risk': 'low', 'sterile': False},
                            ],
                        },
                        'Dermatology': {
                            'code': 'DERM',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'DERM-EXAM', 'count': 6, 'capacity': 1, 'risk': 'low', 'sterile': False},
                                {'type': 'procedure', 'prefix': 'DERM-PROC', 'count': 2, 'capacity': 1, 'risk': 'medium', 'sterile': True},
                            ],
                        },
                    },
                },
                5: {
                    'departments': {
                        'General Surgery': {
                            'code': 'SURG',
                            'rooms': [
                                {'type': 'operating', 'prefix': 'SURG-OT', 'count': 8, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'procedure', 'prefix': 'SURG-PRE', 'count': 4, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'icu', 'prefix': 'SURG-SICU', 'count': 10, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'ward', 'prefix': 'SURG-WARD', 'count': 6, 'capacity': 4, 'risk': 'high', 'sterile': False},
                            ],
                        },
                    },
                },
            },
        },
        'Women & Children Block': {
            'floors': {
                1: {
                    'departments': {
                        'Obstetrics & Gynecology': {
                            'code': 'OBGY',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'OBGY-EXAM', 'count': 8, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'operating', 'prefix': 'OBGY-OT', 'count': 4, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'ward', 'prefix': 'OBGY-WARD', 'count': 6, 'capacity': 4, 'risk': 'medium', 'sterile': False},
                                {'type': 'procedure', 'prefix': 'OBGY-LDR', 'count': 6, 'capacity': 1, 'risk': 'high', 'sterile': True},
                            ],
                        },
                    },
                },
                2: {
                    'departments': {
                        'Pediatrics': {
                            'code': 'PED',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'PED-EXAM', 'count': 8, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'ward', 'prefix': 'PED-WARD', 'count': 5, 'capacity': 4, 'risk': 'medium', 'sterile': False},
                                {'type': 'nicu', 'prefix': 'PED-NICU', 'count': 12, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'isolation', 'prefix': 'PED-ISO', 'count': 3, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                            ],
                        },
                    },
                },
            },
        },
        'Diagnostics Wing': {
            'floors': {
                1: {
                    'departments': {
                        'Gastroenterology': {
                            'code': 'GI',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'GI-EXAM', 'count': 6, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'endoscopy', 'prefix': 'GI-ENDO', 'count': 4, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'procedure', 'prefix': 'GI-PROC', 'count': 2, 'capacity': 1, 'risk': 'high', 'sterile': True},
                            ],
                        },
                        'Nephrology': {
                            'code': 'NEPH',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'NEPH-EXAM', 'count': 4, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'dialysis', 'prefix': 'NEPH-DIA', 'count': 10, 'capacity': 1, 'risk': 'high', 'sterile': True},
                            ],
                        },
                    },
                },
                2: {
                    'departments': {
                        'Oncology': {
                            'code': 'ONCO',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'ONCO-EXAM', 'count': 6, 'capacity': 1, 'risk': 'medium', 'sterile': False},
                                {'type': 'procedure', 'prefix': 'ONCO-CHEMO', 'count': 8, 'capacity': 1, 'risk': 'high', 'sterile': True},
                                {'type': 'isolation', 'prefix': 'ONCO-ISO', 'count': 4, 'capacity': 1, 'risk': 'critical', 'sterile': True},
                                {'type': 'ward', 'prefix': 'ONCO-WARD', 'count': 4, 'capacity': 3, 'risk': 'high', 'sterile': False},
                            ],
                        },
                    },
                },
            },
        },
        'Rehabilitation Center': {
            'floors': {
                1: {
                    'departments': {
                        'Physical Medicine': {
                            'code': 'PM',
                            'rooms': [
                                {'type': 'rehab', 'prefix': 'PM-REHAB', 'count': 8, 'capacity': 2, 'risk': 'low', 'sterile': False},
                                {'type': 'examination', 'prefix': 'PM-EXAM', 'count': 4, 'capacity': 1, 'risk': 'low', 'sterile': False},
                            ],
                        },
                        'Psychiatry': {
                            'code': 'PSY',
                            'rooms': [
                                {'type': 'examination', 'prefix': 'PSY-EXAM', 'count': 6, 'capacity': 1, 'risk': 'low', 'sterile': False},
                                {'type': 'ward', 'prefix': 'PSY-WARD', 'count': 3, 'capacity': 4, 'risk': 'low', 'sterile': False},
                            ],
                        },
                    },
                },
            },
        },
    },
}

# Shared equipment pool — extends as the hospital acquires more devices
EQUIPMENT_POOL = [
    {'type': 'ventilator', 'prefix': 'VENT', 'count': 30},
    {'type': 'xray_portable', 'prefix': 'PXRAY', 'count': 10},
    {'type': 'ultrasound', 'prefix': 'USG', 'count': 8},
    {'type': 'ecg', 'prefix': 'ECG', 'count': 20},
    {'type': 'infusion_pump', 'prefix': 'PUMP', 'count': 50},
    {'type': 'wheelchair', 'prefix': 'WC', 'count': 40},
    {'type': 'stretcher', 'prefix': 'STR', 'count': 25},
    {'type': 'defibrillator', 'prefix': 'DEFIB', 'count': 15},
    {'type': 'monitor', 'prefix': 'MON', 'count': 40},
    {'type': 'suction', 'prefix': 'SUC', 'count': 20},
]


ROOM_TYPE_NAMES = {
    'examination': 'Examination Room',
    'imaging': 'Imaging Suite',
    'icu': 'ICU Bed',
    'ward': 'General Ward',
    'operating': 'Operating Theater',
    'lab': 'Laboratory',
    'emergency': 'Emergency Bay',
    'procedure': 'Procedure Room',
    'isolation': 'Isolation Room',
    'nicu': 'NICU Bay',
    'dialysis': 'Dialysis Station',
    'pharmacy': 'Pharmacy',
    'blood_bank': 'Blood Bank',
    'rehab': 'Rehabilitation Room',
    'radiology': 'Radiology Suite',
    'endoscopy': 'Endoscopy Suite',
    'cathlab': 'Catheterization Lab',
}

EQUIPMENT_TYPE_NAMES = {
    'ventilator': 'Ventilator',
    'xray_portable': 'Portable X-Ray',
    'ultrasound': 'Ultrasound Machine',
    'ecg': 'ECG Machine',
    'infusion_pump': 'Infusion Pump',
    'wheelchair': 'Wheelchair',
    'stretcher': 'Stretcher',
    'defibrillator': 'Defibrillator',
    'monitor': 'Patient Monitor',
    'suction': 'Suction Machine',
}


class Command(BaseCommand):
    help = 'Set up hospital rooms and equipment infrastructure.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing rooms and equipment before creating new ones.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing rooms and equipment...')
            Room.objects.all().delete()
            Equipment.objects.all().delete()

        room_count = 0
        dept_count = 0

        for building_name, building_data in HOSPITAL_LAYOUT['buildings'].items():
            for floor_num, floor_data in building_data['floors'].items():
                for dept_name, dept_config in floor_data['departments'].items():
                    # Reuse existing department by code or name to avoid conflicts
                    try:
                        dept = Department.objects.get(code=dept_config['code'])
                    except Department.DoesNotExist:
                        try:
                            dept = Department.objects.get(name=dept_name)
                        except Department.DoesNotExist:
                            dept = Department.objects.create(
                                code=dept_config['code'],
                                name=dept_name,
                                floor=floor_num,
                                building=building_name,
                                phone='0000000000',
                                email=f"{dept_config['code'].lower()}@securemed.hospital",
                            )
                            dept_count += 1

                    # Create rooms for this department
                    for room_spec in dept_config['rooms']:
                        for i in range(1, room_spec['count'] + 1):
                            room_id = f"{room_spec['prefix']}-{i:02d}"
                            type_label = ROOM_TYPE_NAMES.get(room_spec['type'], room_spec['type'])
                            room_name = f"{type_label} {i} ({dept_name})"

                            _, created = Room.objects.get_or_create(
                                room_id=room_id,
                                defaults={
                                    'name': room_name,
                                    'room_type': room_spec['type'],
                                    'department': dept,
                                    'floor': floor_num,
                                    'building': building_name,
                                    'capacity': room_spec['capacity'],
                                    'risk_level': room_spec['risk'],
                                    'requires_sterilization': room_spec['sterile'],
                                }
                            )
                            if created:
                                room_count += 1

        # Create equipment pool
        equipment_count = 0
        for eq_spec in EQUIPMENT_POOL:
            for i in range(1, eq_spec['count'] + 1):
                eq_id = f"{eq_spec['prefix']}-{i:04d}"
                type_label = EQUIPMENT_TYPE_NAMES.get(eq_spec['type'], eq_spec['type'])
                eq_name = f"{type_label} #{i}"

                _, created = Equipment.objects.get_or_create(
                    equipment_id=eq_id,
                    defaults={
                        'name': eq_name,
                        'equipment_type': eq_spec['type'],
                    }
                )
                if created:
                    equipment_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Hospital setup complete: '
            f'{dept_count} departments, {room_count} rooms, {equipment_count} equipment items created.'
        ))

        # Sync to Neo4j if available
        try:
            from apps.clinical.infection_tracking.graph_service import HospitalGraphService
            graph = HospitalGraphService.get_instance()
            graph.ensure_indexes()
            for room in Room.objects.select_related('department').filter(is_active=True):
                graph.sync_room(room)
            for eq in Equipment.objects.filter(is_active=True):
                graph.sync_equipment(eq)
            self.stdout.write(self.style.SUCCESS('Rooms and equipment synced to Neo4j graph.'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f'Neo4j sync skipped (not available): {e}'
            ))
