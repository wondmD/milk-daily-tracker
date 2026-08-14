from django.db import models
from django.conf import settings
from settlements.models import SettlementPeriod
from suppliers.models import Supplier

class SupplierAdvance(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending (Not Deducted)'
        DEDUCTED = 'DEDUCTED', 'Deducted from Settlement'

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='advances')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    ethiopian_date = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # The settlement period this advance was deducted from
    settlement_period = models.ForeignKey(SettlementPeriod, on_delete=models.SET_NULL, null=True, blank=True, related_name='deducted_advances')
    
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Advance: {self.supplier.name} - {self.amount} ({self.status})"


class Payment(models.Model):
    class PaymentType(models.TextChoices):
        CUSTOMER_PAYMENT = 'CUSTOMER_PAYMENT', 'Customer Payment'
        SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT', 'Supplier Payment'
        OTHER = 'OTHER', 'Other'

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        TELEBIRR = 'TELEBIRR', 'Telebirr'
        CBE_BIRR = 'CBE_BIRR', 'CBE Birr'
        OTHER = 'OTHER', 'Other'

    payment_type = models.CharField(max_length=50, choices=PaymentType.choices)
    related_settlement_id = models.IntegerField(blank=True, null=True, help_text="ID of CustomerSettlement or SupplierSettlement")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PaymentMethod.choices)
    ethiopian_payment_date = models.CharField(max_length=20)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_payment_type_display()} - {self.amount} ({self.get_payment_method_display()})"
