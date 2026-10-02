from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import SettlementPeriod, SupplierSettlement, CustomerSettlement
from .serializers import SettlementPeriodSerializer, SupplierSettlementSerializer, CustomerSettlementSerializer
from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery
from .coordination import refresh_customer_settlement, refresh_period_from_records, refresh_supplier_settlement
from .pricing import apply_customer_period_price, apply_period_supplier_price

class SettlementPeriodViewSet(viewsets.ModelViewSet):
    queryset = SettlementPeriod.objects.all().order_by('-created_at')
    serializer_class = SettlementPeriodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        SettlementPeriod.ensure_current_period()
        periods = list(super().get_queryset())
        for period in periods:
            refresh_period_from_records(period)
        return super().get_queryset()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def calculate_settlements(self, request, pk=None):
        period = self.get_object()
        anchor_day = 1 if period.period_number == 1 else 16

        supplier_ids = MilkCollection.objects.filter(
            ethiopian_year=period.ethiopian_year,
            ethiopian_month=period.ethiopian_month,
        ).values_list('supplier_id', flat=True).distinct()
        for supplier_id in supplier_ids:
            refresh_supplier_settlement(supplier_id, period.ethiopian_year, period.ethiopian_month, anchor_day)

        customer_ids = MilkDelivery.objects.filter(
            ethiopian_year=period.ethiopian_year,
            ethiopian_month=period.ethiopian_month,
        ).values_list('customer_id', flat=True).distinct()
        for customer_id in customer_ids:
            refresh_customer_settlement(customer_id, period.ethiopian_year, period.ethiopian_month, anchor_day)

        period.status = SettlementPeriod.Status.CALCULATED
        period.save()
        
        return Response({'status': 'Settlements calculated successfully'})

    @action(detail=True, methods=['post'], url_path='supplier-price')
    def set_supplier_price(self, request, pk=None):
        period = apply_period_supplier_price(self.get_object(), request.data.get('price'))
        return Response(self.get_serializer(period).data)


class SupplierSettlementViewSet(viewsets.ModelViewSet):
    queryset = SupplierSettlement.objects.all()
    serializer_class = SupplierSettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        periods = SettlementPeriod.objects.all()
        for period in periods:
            refresh_period_from_records(period)
        return super().get_queryset()


class CustomerSettlementViewSet(viewsets.ModelViewSet):
    queryset = CustomerSettlement.objects.all()
    serializer_class = CustomerSettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        periods = SettlementPeriod.objects.all()
        for period in periods:
            refresh_period_from_records(period)
        return super().get_queryset()

    @action(detail=True, methods=['post'], url_path='price')
    def set_price(self, request, pk=None):
        settlement = apply_customer_period_price(self.get_object(), request.data.get('price'))
        return Response(self.get_serializer(settlement).data)
