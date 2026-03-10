from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0002_auditlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='Hospital',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True)),
                ('location', models.CharField(max_length=200)),
                ('beds', models.PositiveIntegerField(default=0)),
                ('occupancy_percent', models.PositiveSmallIntegerField(default=0)),
                ('doctors', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'hospitals',
                'ordering': ['name'],
            },
        ),
    ]
