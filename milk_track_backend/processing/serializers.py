from rest_framework import serializers
from .models import Product, ProductInventory, ProcessingBatch

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class ProductInventorySerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ProductInventory
        fields = '__all__'
        read_only_fields = ['last_updated']

class ProcessingBatchSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ProcessingBatch
        fields = '__all__'
        read_only_fields = ['created_at']
