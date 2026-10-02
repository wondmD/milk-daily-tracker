import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0001_initial'),
        ('distributions', '0002_milkdelivery_unique_customer_delivery_per_day'),
    ]

    operations = [
        migrations.AddField(
            model_name='milkdelivery',
            name='buyer_name',
            field=models.CharField(blank=True, default='', help_text='Name for a one-time buyer who is not saved as a customer', max_length=255),
        ),
        migrations.AlterField(
            model_name='milkdelivery',
            name='customer',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='deliveries', to='customers.customer'),
        ),
    ]
