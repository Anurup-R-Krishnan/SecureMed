from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0002_add_wellness_tip'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='patient',
            name='current_medications',
        ),
    ]
