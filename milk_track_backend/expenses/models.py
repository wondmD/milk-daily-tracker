from django.db import models
from django.conf import settings
from settlements.models import SettlementPeriod

class Expense(models.Model):
    class Category(models.TextChoices):
        FUEL = 'FUEL', 'Fuel'
        WORKER_PAYMENT = 'WORKER_PAYMENT', 'Worker Payment'
        TRANSPORTATION = 'TRANSPORTATION', 'Transportation'
        VEHICLE_MAINTENANCE = 'VEHICLE_MAINTENANCE', 'Vehicle Maintenance'
        PACKAGING = 'PACKAGING', 'Packaging'
        ELECTRICITY = 'ELECTRICITY', 'Electricity'
        PROCESSING = 'PROCESSING', 'Processing'
        RENT = 'RENT', 'Rent'
        OTHER = 'OTHER', 'Other'

    category = models.CharField(max_length=50, choices=Category.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    ethiopian_date = models.CharField(max_length=20)
    ethiopian_year = models.IntegerField(default=0)
    ethiopian_month = models.IntegerField(default=0)
    ethiopian_day = models.IntegerField(default=0)
    
    description = models.TextField()
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    related_activity = models.CharField(max_length=255, blank=True, null=True)
    receipt_reference = models.CharField(max_length=255, blank=True, null=True)
    
    settlement_period = models.ForeignKey(SettlementPeriod, on_delete=models.SET_NULL, null=True, blank=True)
    
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_category_display()} - {self.amount} on {self.ethiopian_date}"
