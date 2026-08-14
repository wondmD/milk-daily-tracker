import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "milk_track_backend.settings")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from customers.models import Customer
import traceback

c = Client()
User = get_user_model()
u, _ = User.objects.get_or_create(username='test', defaults={'is_superuser': True, 'is_staff': True})
c.force_login(u)
cust, _ = Customer.objects.get_or_create(business_name='test')

data = {
    "customer": cust.id,
    "customer_details": {"id": cust.id},
    "ethiopian_date": "Test",
    "ethiopian_year": 2017,
    "ethiopian_month": 1,
    "ethiopian_day": 1,
    "delivered_quantity": 10,
    "returned_quantity": 0,
    "price_per_liter": 65
}

try:
    response = c.post('/api/milk-deliveries/', data, content_type='application/json')
    print(response.status_code)
    if response.status_code >= 400:
        print(response.json())
except Exception as e:
    traceback.print_exc()
