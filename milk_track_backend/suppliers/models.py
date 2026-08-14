from django.db import models

class Supplier(models.Model):
    class SupplierType(models.TextChoices):
        INDIVIDUAL_FARMER = 'INDIVIDUAL_FARMER', 'Individual Farmer'
        DAIRY_FARM = 'DAIRY_FARM', 'Dairy Farm'
        COOPERATIVE = 'COOPERATIVE', 'Cooperative'
        COLLECTION_CENTER = 'COLLECTION_CENTER', 'Collection Center'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'

    name = models.CharField(max_length=255)
    supplier_type = models.CharField(max_length=50, choices=SupplierType.choices)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    default_milk_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Default price per liter in ETB")
    payment_information = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_supplier_type_display()})"
