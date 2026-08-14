from rest_framework import serializers
from .models import MilkCollection
from suppliers.serializers import SupplierSerializer

class MilkCollectionSerializer(serializers.ModelSerializer):
    supplier_details = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = MilkCollection
        fields = '__all__'
        read_only_fields = ['total_quantity', 'created_at']
