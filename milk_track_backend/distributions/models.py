from django.db import models
from django.conf import settings
from customers.models import Customer
from decimal import Decimal

class MilkDelivery(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='deliveries')
    ethiopian_date = models.CharField(max_length=20, help_text="e.g. Meskerem 5, 2017")
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    ethiopian_day = models.IntegerField()
    
    delivered_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    returned_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    net_quantity = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    price_per_liter = models.DecimalField(max_digits=10, decimal_places=2, help_text="Locked price per liter at delivery time")
    distribution_worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.net_quantity = self.delivered_quantity - self.returned_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer.business_name} - {self.ethiopian_date} - Net: {self.net_quantity}L"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['customer', 'ethiopian_year', 'ethiopian_month', 'ethiopian_day'],
                name='unique_customer_delivery_per_day'
            )
        ]

class MilkReturn(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='returns')
    ethiopian_date = models.CharField(max_length=20)
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    ethiopian_day = models.IntegerField()
    
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=255)
    milk_condition = models.CharField(max_length=100)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Return: {self.customer.business_name} - {self.quantity}L"
