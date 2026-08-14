from rest_framework import serializers
from .models import MilkDelivery, MilkReturn
from customers.serializers import CustomerSerializer

class MilkDeliverySerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)

    class Meta:
        model = MilkDelivery
        fields = '__all__'
        read_only_fields = ['net_quantity', 'created_at']

class MilkReturnSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)

    class Meta:
        model = MilkReturn
        fields = '__all__'
        read_only_fields = ['created_at']
