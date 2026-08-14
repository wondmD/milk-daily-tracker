from django.contrib import admin

# Register your models here.

#add models to the admin site
from .models import Payment, SupplierAdvance

admin.site.register(Payment)
admin.site.register(SupplierAdvance)