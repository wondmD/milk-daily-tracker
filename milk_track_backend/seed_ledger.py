import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'milk_track_backend.settings')
django.setup()

from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery
from milk_inventory.models import MilkLedgerTransaction
from django.contrib.auth import get_user_model

def run():
    User = get_user_model()
    admin = User.objects.first()

    print("Clearing existing ledger transactions...")
    MilkLedgerTransaction.objects.all().delete()

    print("Generating ledger for collections...")
    collections = MilkCollection.objects.all()
    for col in collections:
        MilkLedgerTransaction.objects.create(
            ethiopian_date=col.ethiopian_date,
            ethiopian_year=col.ethiopian_year,
            ethiopian_month=col.ethiopian_month,
            ethiopian_day=col.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.COLLECTION,
            quantity=col.total_quantity,
            reference_id=f"COL-{col.id}",
            notes=f"Collection from {col.supplier.name}",
            recorded_by=admin
        )

    print("Generating ledger for deliveries...")
    deliveries = MilkDelivery.objects.all()
    for deliv in deliveries:
        MilkLedgerTransaction.objects.create(
            ethiopian_date=deliv.ethiopian_date,
            ethiopian_year=deliv.ethiopian_year,
            ethiopian_month=deliv.ethiopian_month,
            ethiopian_day=deliv.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.DELIVERY,
            quantity=-deliv.delivered_quantity,
            reference_id=f"DEL-{deliv.id}",
            notes=f"Delivery to {deliv.customer.business_name}",
            recorded_by=admin
        )
        if deliv.returned_quantity > 0:
            MilkLedgerTransaction.objects.create(
                ethiopian_date=deliv.ethiopian_date,
                ethiopian_year=deliv.ethiopian_year,
                ethiopian_month=deliv.ethiopian_month,
                ethiopian_day=deliv.ethiopian_day,
                transaction_type=MilkLedgerTransaction.TransactionType.RETURN,
                quantity=deliv.returned_quantity,
                reference_id=f"DEL-RET-{deliv.id}",
                notes=f"Return during delivery to {deliv.customer.business_name}",
                recorded_by=admin
            )

    print("Ledger generated successfully.")

if __name__ == '__main__':
    run()
