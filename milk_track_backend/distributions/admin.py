from django.contrib import admin

# Register your models here.
from .models import MilkDelivery, MilkReturn

admin.site.register(MilkDelivery)
admin.site.register(MilkReturn)