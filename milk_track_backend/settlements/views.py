from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, F
from .models import SettlementPeriod, SupplierSettlement, CustomerSettlement
from .serializers import SettlementPeriodSerializer, SupplierSettlementSerializer, CustomerSettlementSerializer
from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery
from payments.models import SupplierAdvance

class SettlementPeriodViewSet(viewsets.ModelViewSet):
    queryset = SettlementPeriod.objects.all().order_by('-created_at')
    serializer_class = SettlementPeriodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        SettlementPeriod.ensure_current_period()
        return super().get_queryset()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def calculate_settlements(self, request, pk=None):
        period = self.get_object()
        
        # Calculate Supplier Settlements
        collections = MilkCollection.objects.filter(
            ethiopian_year=period.ethiopian_year,
            ethiopian_month=period.ethiopian_month,
        )
        if period.period_number == 1:
            collections = collections.filter(ethiopian_day__lte=15)
        else:
            collections = collections.filter(ethiopian_day__gt=15)

        supplier_totals = collections.values('supplier').annotate(
            total_qty=Sum('total_quantity'),
            total_amt=Sum(F('total_quantity') * F('price_per_liter'))
        )

        for st in supplier_totals:
            supplier_id = st['supplier']
            gross = st['total_amt']
            
            # Find and sum pending advances for this period
            advances = SupplierAdvance.objects.filter(
                supplier_id=supplier_id,
                settlement_period=period,
                status=SupplierAdvance.Status.PENDING
            )
            total_advances = advances.aggregate(total=Sum('amount'))['total'] or 0
            
            final_amt = gross - total_advances
            
            SupplierSettlement.objects.update_or_create(
                supplier_id=supplier_id,
                settlement_period=period,
                defaults={
                    'total_milk_collected': st['total_qty'],
                    'gross_amount': gross,
                    'adjustments': total_advances,
                    'final_amount': final_amt,
                    'remaining_balance': final_amt
                }
            )
            
            # Mark advances as deducted
            advances.update(status=SupplierAdvance.Status.DEDUCTED)

        # Calculate Customer Settlements
        deliveries = MilkDelivery.objects.filter(
            ethiopian_year=period.ethiopian_year,
            ethiopian_month=period.ethiopian_month,
        )
        if period.period_number == 1:
            deliveries = deliveries.filter(ethiopian_day__lte=15)
        else:
            deliveries = deliveries.filter(ethiopian_day__gt=15)

        customer_totals = deliveries.values('customer').annotate(
            tot_del=Sum('delivered_quantity'),
            tot_ret=Sum('returned_quantity'),
            tot_net=Sum('net_quantity'),
            tot_amt=Sum(F('net_quantity') * F('price_per_liter'))
        )

        for ct in customer_totals:
            CustomerSettlement.objects.update_or_create(
                customer_id=ct['customer'],
                settlement_period=period,
                defaults={
                    'total_delivered': ct['tot_del'],
                    'total_returned': ct['tot_ret'],
                    'net_quantity': ct['tot_net'],
                    'gross_amount': ct['tot_amt'],
                    'final_amount': ct['tot_amt'],
                    'remaining_balance': ct['tot_amt']
                }
            )
            
        period.status = SettlementPeriod.Status.CALCULATED
        period.save()
        
        return Response({'status': 'Settlements calculated successfully'})


class SupplierSettlementViewSet(viewsets.ModelViewSet):
    queryset = SupplierSettlement.objects.all()
    serializer_class = SupplierSettlementSerializer
    permission_classes = [IsAuthenticated]


class CustomerSettlementViewSet(viewsets.ModelViewSet):
    queryset = CustomerSettlement.objects.all()
    serializer_class = CustomerSettlementSerializer
    permission_classes = [IsAuthenticated]
