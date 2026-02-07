import os
import django
from datetime import date, time, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from appointments.models import Doctor, Availability
from patients.models import Patient, TimelineEvent

def seed_data():
    # 1. Doctors
    doc1 = Doctor.objects.get_or_create(id=1, name='Dr. Sarah Smith', specialty='Cardiology', hospital='Fortis Delhi', fee=500, description='Dr. Sarah Smith is a highly skilled specialist in Cardiology with years of experience at Fortis Delhi.')[0]
    doc2 = Doctor.objects.get_or_create(id=2, name='Dr. Michael Chen', specialty='Neurology', hospital='Fortis Mumbai', fee=450, description='Dr. Michael Chen is a highly skilled specialist in Neurology with years of experience at Fortis Mumbai.')[0]
    doc3 = Doctor.objects.get_or_create(id=3, name='Dr. Rajesh Kumar', specialty='Orthopedics', hospital='Fortis Bangalore', fee=550, description='Dr. Rajesh Kumar is a highly skilled specialist in Orthopedics with years of experience at Fortis Bangalore.')[0]

    # 2. Patients
    pat1 = Patient.objects.get_or_create(id=1, name='John Doe', blood_group='O+', known_allergies=['Penicillin'], emergency_contact='+91 98765 43210')[0]
    pat2 = Patient.objects.get_or_create(id=2, name='Jane Smith', blood_group='A-', known_allergies=['Aspirin'], emergency_contact='+91 87654 32109')[0]

    # 3. Availability for next 30 days for all docs
    today = date.today()
    for doc in [doc1, doc2, doc3]:
        for i in range(0, 30):  # Start from today (0) to 30 days out
            day = today + timedelta(days=i)
            if day.weekday() < 5: # Mon-Fri
                for hour in range(9, 17):
                    Availability.objects.get_or_create(
                        doctor=doc,
                        date=day,
                        start_time=time(hour, 0),
                        end_time=time(hour, 30),
                        slot_type='AVAILABLE'
                    )

    # 4. Timeline for Patient 1
    TimelineEvent.objects.get_or_create(
        patient=pat1,
        date=today - timedelta(days=10),
        type='VISIT',
        title='Cardiology Consultation',
        description='Routine cardiac evaluation',
        provider='Dr. Sarah Smith',
        facility='Fortis Delhi',
        details={'chiefComplaint': 'Chest discomfort'}
    )
    TimelineEvent.objects.get_or_create(
        patient=pat1,
        date=today - timedelta(days=5),
        type='LAB_RESULT',
        title='Blood Panel',
        description='Full metabolic panel',
        provider='Fortis Labs',
        facility='Fortis Delhi',
        details={'glucose': '95 mg/dL', 'cholesterol': '180 mg/dL'}
    )
    TimelineEvent.objects.get_or_create(
        patient=pat1,
        date=today - timedelta(days=2),
        type='MEDICATION',
        title='Prescription: Atorvastatin',
        description='10mg daily',
        provider='Dr. Sarah Smith',
        facility='Fortis Delhi',
        details={'dosage': '10mg', 'frequency': 'QD'}
    )

    print("Seeding complete.")

if __name__ == '__main__':
    seed_data()
