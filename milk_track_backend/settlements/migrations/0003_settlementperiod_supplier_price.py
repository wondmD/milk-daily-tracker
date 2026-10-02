from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settlements', '0002_unique_settlement_keys'),
    ]

    operations = [
        migrations.AddField(
            model_name='settlementperiod',
            name='supplier_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='One purchase price per liter for every supplier in this period',
                max_digits=10,
                null=True,
            ),
        ),
    ]
