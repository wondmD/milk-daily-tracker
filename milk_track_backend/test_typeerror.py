import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "milk_track_backend.settings")
django.setup()

from distributions.models import MilkDelivery
from customers.models import Customer
try:
    c = Customer.objects.first()
    MilkDelivery.objects.create(
        customer=c,
        ethiopian_date='Test 3', ethiopian_year=2017, ethiopian_month=1, ethiopian_day=1,
        price_per_liter=65
    )
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
