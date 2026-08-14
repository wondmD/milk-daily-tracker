from django.db import models
from django.conf import settings

class Product(models.Model):
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    unit = models.CharField(max_length=20, help_text="e.g. kg, liter")
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class ProductInventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory')
    quantity_available = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_available} {self.product.unit}"

class ProcessingBatch(models.Model):
    ethiopian_date = models.CharField(max_length=20)
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    ethiopian_day = models.IntegerField()
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='batches')
    input_milk_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    output_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    processing_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Batch: {self.product.name} on {self.ethiopian_date}"
