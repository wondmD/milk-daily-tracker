from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F
from .models import Supplier
from .serializers import SupplierSerializer
from milk_collections.models import MilkCollection
from settlements.models import SettlementPeriod, SupplierSettlement

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('-created_date')
    serializer_class = SupplierSerializer

    @action(detail=False, methods=['get'])
    def current_period_summary(self, request):
        from ethiopian_date import EthiopianDateConverter
        import datetime
        
        period = SettlementPeriod.ensure_current_period()
        suppliers = self.get_queryset()
        
        today = datetime.date.today()
        d = EthiopianDateConverter.date_to_ethiopian(today)
        
        today_collections = MilkCollection.objects.filter(
            ethiopian_year=d.year,
            ethiopian_month=d.month,
            ethiopian_day=d.day
        ).values_list('supplier_id', flat=True)
        today_collected_suppliers = set(today_collections)
        
        collections = MilkCollection.objects.filter(
            ethiopian_year=period.ethiopian_year,
            ethiopian_month=period.ethiopian_month,
        )
        if period.period_number == 1:
            collections = collections.filter(ethiopian_day__lte=15)
        else:
            collections = collections.filter(ethiopian_day__gt=15)
            
        totals = collections.values('supplier').annotate(
            total_qty=Sum('total_quantity'),
            total_amt=Sum(F('total_quantity') * F('price_per_liter'))
        )
        
        totals_dict = {t['supplier']: t for t in totals}
        
        # Get daily breakdown
        daily_collections = collections.values('supplier', 'ethiopian_day').annotate(
            qty=Sum('total_quantity')
        )
        
        daily_dict = {}
        for dc in daily_collections:
            sup_id = dc['supplier']
            day = dc['ethiopian_day']
            if sup_id not in daily_dict:
                daily_dict[sup_id] = {}
            daily_dict[sup_id][day] = float(dc['qty'])

        result = []
        for s in suppliers:
            t = totals_dict.get(s.id, {'total_qty': 0, 'total_amt': 0})
            data = SupplierSerializer(s).data
            data['current_period_milk'] = float(t.get('total_qty') or 0)
            data['current_period_price'] = float(t.get('total_amt') or 0)
            data['period_name'] = str(period)
            data['period_start'] = period.start_date_ethiopian
            data['period_end'] = period.end_date_ethiopian
            data['has_record_today'] = s.id in today_collected_suppliers
            data['daily_records'] = daily_dict.get(s.id, {})
            result.append(data)
            
        return Response(result)

    @action(detail=True, methods=['get'])
    def settlements_history(self, request, pk=None):
        supplier = self.get_object()
        settlements = SupplierSettlement.objects.filter(supplier=supplier).order_by('-settlement_period__created_at')
        
        data = []
        for s in settlements:
            # Avoid division by zero
            milk = float(s.total_milk_collected)
            amt = float(s.gross_amount)
            unit_price = amt / milk if milk > 0 else 0
            
            data.append({
                'id': s.id,
                'period_id': s.settlement_period.id,
                'period_name': str(s.settlement_period),
                'start_date': s.settlement_period.start_date_ethiopian,
                'end_date': s.settlement_period.end_date_ethiopian,
                'total_milk': s.total_milk_collected,
                'unit_price_avg': round(unit_price, 2),
                'gross_amount': s.gross_amount,
                'adjustments': s.adjustments,
                'total_amount': s.final_amount,
                'amount_paid': s.amount_paid,
                'remaining_balance': s.remaining_balance,
                'payment_status': s.payment_status,
                'status': s.settlement_period.status
            })
            
        return Response(data)
