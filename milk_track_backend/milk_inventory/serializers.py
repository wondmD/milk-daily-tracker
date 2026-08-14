from rest_framework import serializers
from .models import MilkLedgerTransaction

class MilkLedgerTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilkLedgerTransaction
        fields = '__all__'
        read_only_fields = ['created_at']
