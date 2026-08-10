# Remove Product.unit FK and Unit model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_alter_product_unit'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='product',
            name='unit',
        ),
        migrations.DeleteModel(
            name='Unit',
        ),
    ]
