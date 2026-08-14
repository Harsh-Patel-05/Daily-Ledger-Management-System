from django.db import migrations, models


def backfill_gst_type(apps, schema_editor):
    Invoice = apps.get_model('invoices', 'Invoice')
    Invoice.objects.filter(tax_rate=0).update(gst_type='Non-GST')


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0002_invoiceitem_product_salesreturn'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='gst_type',
            field=models.CharField(
                choices=[('GST', 'GST'), ('Non-GST', 'Non-GST')],
                default='GST',
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_gst_type, migrations.RunPython.noop),
    ]
