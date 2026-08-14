from django.contrib import admin

# add models to the admin site
from .models import ProcessingBatch, Product, ProductInventory

admin.site.register(ProcessingBatch)
admin.site.register(Product)
admin.site.register(ProductInventory)
