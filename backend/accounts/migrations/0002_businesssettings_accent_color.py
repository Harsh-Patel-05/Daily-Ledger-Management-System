from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='businesssettings',
            name='accent_color',
            field=models.CharField(default='blue', max_length=20),
        ),
    ]
