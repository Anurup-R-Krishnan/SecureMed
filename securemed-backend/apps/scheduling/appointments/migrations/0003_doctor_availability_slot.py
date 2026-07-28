import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0002_add_referral_model'),
    ]

    operations = [
        migrations.CreateModel(
            name='DoctorAvailabilitySlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True)),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('slot_type', models.CharField(choices=[('available', 'Available'), ('surgery', 'Surgery'), ('break', 'Break')], default='available', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availability_slots', to='departments.doctor')),
            ],
            options={
                'db_table': 'doctor_availability_slots',
                'ordering': ['date', 'start_time'],
                'unique_together': {('doctor', 'date', 'start_time', 'end_time')},
            },
        ),
        migrations.AddIndex(
            model_name='doctoravailabilityslot',
            index=models.Index(fields=['doctor', 'date'], name='doctor_avai_doctor__5b1e57_idx'),
        ),
        migrations.AddIndex(
            model_name='doctoravailabilityslot',
            index=models.Index(fields=['date', 'start_time'], name='doctor_avai_date_st_4e57e2_idx'),
        ),
    ]
