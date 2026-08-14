from rest_framework import serializers
from .models import Payment, SupplierAdvance

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['created_at']

class SupplierAdvanceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    class Meta:
        model = SupplierAdvance
        fields = '__all__'
        read_only_fields = ['created_at', 'recorded_by']
