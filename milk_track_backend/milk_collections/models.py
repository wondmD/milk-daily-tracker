from django.db import models
from django.conf import settings
from suppliers.models import Supplier

class MilkCollection(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='collections')
    ethiopian_date = models.CharField(max_length=20, help_text="e.g. Meskerem 5, 2017")
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    ethiopian_day = models.IntegerField()
    
    morning_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    evening_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    total_quantity = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    price_per_liter = models.DecimalField(max_digits=10, decimal_places=2, help_text="Locked price per liter at collection time")
    collection_worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.total_quantity = self.morning_quantity + self.evening_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.supplier.name} - {self.ethiopian_date} - {self.total_quantity}L"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['supplier', 'ethiopian_year', 'ethiopian_month', 'ethiopian_day'],
                name='unique_supplier_collection_per_day'
            )
        ]
