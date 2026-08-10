# Generated manually — Product.purchase_date

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_remove_unit'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='purchase_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['owner', 'purchase_date'], name='inventory_p_owner_i_7a2c1d_idx'),
        ),
    ]
