from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('milk_inventory', '0002_milkwastage'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyMilkPool',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ethiopian_year', models.IntegerField()),
                ('ethiopian_month', models.IntegerField()),
                ('ethiopian_day', models.IntegerField()),
            ],
            options={
                'constraints': [
                    models.UniqueConstraint(
                        fields=('ethiopian_year', 'ethiopian_month', 'ethiopian_day'),
                        name='unique_daily_milk_pool',
                    )
                ],
            },
        ),
    ]
