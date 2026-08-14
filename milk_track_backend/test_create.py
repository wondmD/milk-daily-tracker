import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "milk_track_backend.settings")
django.setup()

from distributions.serializers import MilkDeliverySerializer

data = {
    "customer": 1,
    "ethiopian_date": "Test 1",
    "ethiopian_year": 2017,
    "ethiopian_month": 1,
    "ethiopian_day": 1,
    "delivered_quantity": 10,
    "returned_quantity": 0,
    "price_per_liter": 65
}

serializer = MilkDeliverySerializer(data=data)
if serializer.is_valid():
    print("Saving...")
    try:
        serializer.save()
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print(serializer.errors)
