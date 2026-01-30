import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Patient',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('dob', models.DateField()),
                ('mrn', models.CharField(help_text='Medical Record Number', max_length=50, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='TestPanel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('cost', models.DecimalField(decimal_places=2, max_digits=10)),
                ('is_active', models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name='Doctor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('specialization', models.CharField(max_length=100)),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='LabOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('ORDERED', 'Ordered'), ('COLLECTED', 'Collected'), ('PROCESSING', 'Processing'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='ORDERED', max_length=20)),
                ('sample_id', models.CharField(editable=False, max_length=50, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('ordering_doctor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordered_labs', to='lab.doctor')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lab_orders', to='lab.patient')),
                ('panels', models.ManyToManyField(to='lab.testpanel')),
            ],
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('related_order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='lab.laborder')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='LabResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('result_data', models.JSONField(blank=True, default=dict)),
                ('file_upload', models.FileField(blank=True, null=True, upload_to='lab_uploads/')),
                ('comments', models.TextField(blank=True)),
                ('is_abnormal', models.BooleanField(default=False)),
                ('verified_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='results', to='lab.laborder')),
                ('technician', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_results', to=settings.AUTH_USER_MODEL)),
                ('test_panel', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='lab.testpanel')),
            ],
        ),
    ]
