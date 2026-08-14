from django.contrib import admin

# Register your models here.
from .models import SettlementPeriod, SupplierSettlement, CustomerSettlement
admin.site.register(SettlementPeriod)
admin.site.register(SupplierSettlement)
admin.site.register(CustomerSettlement)