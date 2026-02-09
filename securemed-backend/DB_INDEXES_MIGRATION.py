"""
Database indexes for performance optimization
Run: python manage.py makemigrations --empty core --name add_indexes
Then replace with this content
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
        ('appointments', '0001_initial'),
        ('medical_records', '0008_prescription_override_reason_druginteraction_and_more'),
        ('labs', '0004_labnotification'),
    ]

    operations = [
        # Authentication indexes
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='auth_user_email_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role'], name='auth_user_role_idx'),
        ),
        
        # Appointment indexes
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS appt_date_status_idx ON appointments_appointment(appointment_date, status);",
            reverse_sql="DROP INDEX IF EXISTS appt_date_status_idx;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS appt_doctor_date_idx ON appointments_appointment(doctor_id, appointment_date);",
            reverse_sql="DROP INDEX IF EXISTS appt_doctor_date_idx;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS appt_patient_date_idx ON appointments_appointment(patient_id, appointment_date);",
            reverse_sql="DROP INDEX IF EXISTS appt_patient_date_idx;",
        ),
        
        # Medical records indexes
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS med_rec_patient_date_idx ON medical_records_medicalrecord(patient_id, created_at);",
            reverse_sql="DROP INDEX IF EXISTS med_rec_patient_date_idx;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS prescription_patient_idx ON medical_records_prescription(patient_id, created_at);",
            reverse_sql="DROP INDEX IF EXISTS prescription_patient_idx;",
        ),
        
        # Lab orders indexes
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS lab_order_status_idx ON labs_laborder(status, created_at);",
            reverse_sql="DROP INDEX IF EXISTS lab_order_status_idx;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS lab_order_patient_idx ON labs_laborder(patient_id, created_at);",
            reverse_sql="DROP INDEX IF EXISTS lab_order_patient_idx;",
        ),
    ]
