from rest_framework import serializers
from .models import Expense
from settlements.serializers import SettlementPeriodSerializer

class ExpenseSerializer(serializers.ModelSerializer):
    settlement_period_details = SettlementPeriodSerializer(source='settlement_period', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['created_at']
