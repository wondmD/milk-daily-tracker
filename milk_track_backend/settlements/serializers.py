from rest_framework import serializers
from .models import SettlementPeriod, SupplierSettlement, CustomerSettlement
from suppliers.serializers import SupplierSerializer
from customers.serializers import CustomerSerializer

class SettlementPeriodSerializer(serializers.ModelSerializer):
    supplier_summary = serializers.SerializerMethodField()
    customer_summary = serializers.SerializerMethodField()

    class Meta:
        model = SettlementPeriod
        fields = '__all__'

    def get_supplier_summary(self, obj):
        from django.db.models import Sum
        aggr = obj.supplier_settlements.aggregate(
            total_due=Sum('final_amount'),
            total_paid=Sum('amount_paid')
        )
        total_due = aggr['total_due'] or 0
        total_paid = aggr['total_paid'] or 0
        return {
            'total_due': float(total_due),
            'total_paid': float(total_paid),
            'total_remaining': float(total_due - total_paid)
        }

    def get_customer_summary(self, obj):
        from django.db.models import Sum
        aggr = obj.customer_settlements.aggregate(
            total_due=Sum('final_amount'),
            total_paid=Sum('amount_paid')
        )
        total_due = aggr['total_due'] or 0
        total_paid = aggr['total_paid'] or 0
        return {
            'total_due': float(total_due),
            'total_paid': float(total_paid),
            'total_remaining': float(total_due - total_paid)
        }

class SupplierSettlementSerializer(serializers.ModelSerializer):
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    settlement_period_details = SettlementPeriodSerializer(source='settlement_period', read_only=True)

    class Meta:
        model = SupplierSettlement
        fields = '__all__'

class CustomerSettlementSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    settlement_period_details = SettlementPeriodSerializer(source='settlement_period', read_only=True)

    class Meta:
        model = CustomerSettlement
        fields = '__all__'
