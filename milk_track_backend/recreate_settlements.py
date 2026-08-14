import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'milk_track_backend.settings')
django.setup()

from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery
from settlements.models import SettlementPeriod, SupplierSettlement, CustomerSettlement

def run():
    print("Deleting all existing settlements and periods to let signals recreate them...")
    SupplierSettlement.objects.all().delete()
    CustomerSettlement.objects.all().delete()
    SettlementPeriod.objects.all().delete()

    collections = MilkCollection.objects.all()
    print(f"Re-saving {collections.count()} collections to trigger signals...")
    for c in collections:
        c.save()

    deliveries = MilkDelivery.objects.all()
    print(f"Re-saving {deliveries.count()} deliveries to trigger signals...")
    for d in deliveries:
        d.save()

    print("Successfully recreated settlements via signals!")

if __name__ == '__main__':
    run()
