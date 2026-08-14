from rest_framework import serializers
from .models import MilkLedgerTransaction, MilkWastage

class MilkLedgerTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilkLedgerTransaction
        fields = '__all__'
        read_only_fields = ['created_at']

class MilkWastageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilkWastage
        fields = '__all__'
        read_only_fields = ['created_at']
