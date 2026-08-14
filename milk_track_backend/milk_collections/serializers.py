from rest_framework import serializers
from .models import MilkCollection
from suppliers.serializers import SupplierSerializer

class MilkCollectionSerializer(serializers.ModelSerializer):
    supplier_details = SupplierSerializer(source='supplier', read_only=True)

    price_per_liter = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = MilkCollection
        fields = '__all__'
        read_only_fields = ['total_quantity', 'created_at']
