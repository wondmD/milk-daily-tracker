from django.db import models
from django.conf import settings

class MilkLedgerTransaction(models.Model):
    class TransactionType(models.TextChoices):
        COLLECTION = 'COLLECTION', 'Collection'
        DELIVERY = 'DELIVERY', 'Delivery (Sale)'
        RETURN = 'RETURN', 'Return'
        PROCESSING = 'PROCESSING', 'Processing'
        STORAGE = 'STORAGE', 'Storage'
        WASTE = 'WASTE', 'Waste/Spoiled'
        SALE_OTHER = 'SALE_OTHER', 'Sale Elsewhere'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
        
    ethiopian_date = models.CharField(max_length=20)
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    ethiopian_day = models.IntegerField()

    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    
    # Positive means milk entering available pool, negative means milk leaving
    quantity = models.DecimalField(max_digits=12, decimal_places=2, help_text="Positive for in, Negative for out")
    
    reference_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID of the related record (Collection, Delivery, etc.)")
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type}: {self.quantity}L on {self.ethiopian_date}"

class MilkWastage(models.Model):
    class ReasonChoices(models.TextChoices):
        SPOILED = 'SPOILED', 'Spoiled/Sour'
        SPILLED = 'SPILLED', 'Spilled/Leaked'
        CONTAMINATED = 'CONTAMINATED', 'Contaminated'
        OTHER = 'OTHER', 'Other'

    ethiopian_date = models.CharField(max_length=20)
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    ethiopian_day = models.IntegerField()
    
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount of milk wasted in liters")
    reason = models.CharField(max_length=20, choices=ReasonChoices.choices)
    notes = models.TextField(blank=True, null=True)
    
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity}L Wasted on {self.ethiopian_date} - {self.get_reason_display()}"
