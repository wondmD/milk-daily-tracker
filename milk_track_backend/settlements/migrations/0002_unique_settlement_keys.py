from django.db import migrations, models
from django.db.models import Sum


def _merge_payments(apps, keeper, rows, payment_type, copy_fields):
    Payment = apps.get_model('payments', 'Payment')
    ids = [row.id for row in rows]
    paid = Payment.objects.filter(
        payment_type=payment_type,
        related_settlement_id__in=ids,
    ).aggregate(total=Sum('amount'))['total']
    Payment.objects.filter(
        payment_type=payment_type,
        related_settlement_id__in=ids,
    ).exclude(related_settlement_id=keeper.id).update(related_settlement_id=keeper.id)

    richest = max(rows, key=lambda row: row.final_amount or 0)
    for field in copy_fields:
        setattr(keeper, field, getattr(richest, field))
    if paid is not None:
        keeper.amount_paid = paid
    else:
        keeper.amount_paid = max((row.amount_paid or 0) for row in rows)
    keeper.remaining_balance = (keeper.final_amount or 0) - keeper.amount_paid
    keeper.save()
    for row in rows:
        if row.id != keeper.id:
            row.delete()


def dedupe_settlements(apps, schema_editor):
    SettlementPeriod = apps.get_model('settlements', 'SettlementPeriod')
    SupplierSettlement = apps.get_model('settlements', 'SupplierSettlement')
    CustomerSettlement = apps.get_model('settlements', 'CustomerSettlement')
    SupplierAdvance = apps.get_model('payments', 'SupplierAdvance')

    grouped_periods = {}
    for period in SettlementPeriod.objects.order_by('id'):
        key = (period.ethiopian_year, period.ethiopian_month, period.period_number)
        grouped_periods.setdefault(key, []).append(period)

    for periods in grouped_periods.values():
        if len(periods) < 2:
            continue
        keeper = periods[0]
        for extra in periods[1:]:
            SupplierSettlement.objects.filter(settlement_period_id=extra.id).update(settlement_period_id=keeper.id)
            CustomerSettlement.objects.filter(settlement_period_id=extra.id).update(settlement_period_id=keeper.id)
            SupplierAdvance.objects.filter(settlement_period_id=extra.id).update(settlement_period_id=keeper.id)
            extra.delete()

    grouped_suppliers = {}
    for row in SupplierSettlement.objects.order_by('id'):
        grouped_suppliers.setdefault((row.supplier_id, row.settlement_period_id), []).append(row)
    for rows in grouped_suppliers.values():
        if len(rows) < 2:
            continue
        _merge_payments(
            apps,
            rows[0],
            rows,
            'SUPPLIER_PAYMENT',
            ['total_milk_collected', 'gross_amount', 'adjustments', 'final_amount', 'notes', 'payment_status'],
        )

    grouped_customers = {}
    for row in CustomerSettlement.objects.order_by('id'):
        grouped_customers.setdefault((row.customer_id, row.settlement_period_id), []).append(row)
    for rows in grouped_customers.values():
        if len(rows) < 2:
            continue
        _merge_payments(
            apps,
            rows[0],
            rows,
            'CUSTOMER_PAYMENT',
            ['total_delivered', 'total_returned', 'net_quantity', 'gross_amount', 'adjustments', 'final_amount', 'notes', 'payment_status'],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('settlements', '0001_initial'),
        ('payments', '0002_supplieradvance'),
    ]

    operations = [
        migrations.RunPython(dedupe_settlements, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='settlementperiod',
            constraint=models.UniqueConstraint(
                fields=('ethiopian_year', 'ethiopian_month', 'period_number'),
                name='unique_settlement_period',
            ),
        ),
        migrations.AddConstraint(
            model_name='suppliersettlement',
            constraint=models.UniqueConstraint(
                fields=('supplier', 'settlement_period'),
                name='unique_supplier_settlement',
            ),
        ),
        migrations.AddConstraint(
            model_name='customersettlement',
            constraint=models.UniqueConstraint(
                fields=('customer', 'settlement_period'),
                name='unique_customer_settlement',
            ),
        ),
    ]
