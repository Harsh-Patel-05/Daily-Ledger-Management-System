import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def forwards_migrate_brands(apps, schema_editor):
    Product = apps.get_model('inventory', 'Product')
    Brand = apps.get_model('inventory', 'Brand')
    cache = {}
    for product in Product.objects.exclude(brand_name='').exclude(brand_name__isnull=True).iterator():
        name = (product.brand_name or '').strip()
        if not name:
            continue
        key = (product.owner_id, name.casefold())
        brand = cache.get(key)
        if brand is None:
            brand = Brand.objects.filter(owner_id=product.owner_id, name__iexact=name).first()
            if brand is None:
                brand = Brand.objects.create(
                    owner_id=product.owner_id,
                    name=name[:120],
                    color='#6366f1',
                )
            cache[key] = brand
        product.brand_id = brand.pk
        product.save(update_fields=['brand_id'])


def backwards_migrate_brands(apps, schema_editor):
    Product = apps.get_model('inventory', 'Product')
    Brand = apps.get_model('inventory', 'Brand')
    brand_names = {b.pk: b.name for b in Brand.objects.all()}
    for product in Product.objects.exclude(brand_id=None).iterator():
        product.brand_name = brand_names.get(product.brand_id, '')[:120]
        product.save(update_fields=['brand_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0008_product_brand'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Brand',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('name', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True)),
                ('color', models.CharField(default='#6366f1', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'owner',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='inventory_brands',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AddIndex(
            model_name='brand',
            index=models.Index(fields=['owner', 'name'], name='inventory_b_owner_i_892f68_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='brand',
            unique_together={('owner', 'name')},
        ),
        migrations.RemoveIndex(
            model_name='product',
            name='inventory_p_owner_i_d0429b_idx',
        ),
        migrations.RenameField(
            model_name='product',
            old_name='brand',
            new_name='brand_name',
        ),
        migrations.AddField(
            model_name='product',
            name='brand',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='products',
                to='inventory.brand',
            ),
        ),
        migrations.RunPython(forwards_migrate_brands, backwards_migrate_brands),
        migrations.RemoveField(
            model_name='product',
            name='brand_name',
        ),
    ]
