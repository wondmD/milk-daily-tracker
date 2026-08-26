from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F
from .models import Customer
from .serializers import CustomerSerializer
from distributions.models import MilkDelivery
from settlements.models import SettlementPeriod, CustomerSettlement

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_date')
    serializer_class = CustomerSerializer

    @action(detail=False, methods=['get'])
    def current_period_summary(self, request):
        from ethiopian_date import EthiopianDateConverter
        import datetime

        period = SettlementPeriod.ensure_current_period()
        customers = self.get_queryset()
        
        today = datetime.date.today()
        d = EthiopianDateConverter.date_to_ethiopian(today)
        
        today_deliveries = MilkDelivery.objects.filter(
            ethiopian_year=d.year,
            ethiopian_month=d.month,
            ethiopian_day=d.day
        ).values_list('customer_id', flat=True)
        today_delivered_customers = set(today_deliveries)
        
        deliveries = MilkDelivery.objects.filter(
            ethiopian_year=period.ethiopian_year,
            ethiopian_month=period.ethiopian_month,
        )
        if period.period_number == 1:
            deliveries = deliveries.filter(ethiopian_day__lte=15)
        else:
            deliveries = deliveries.filter(ethiopian_day__gt=15)
            
        totals = deliveries.values('customer').annotate(
            total_net=Sum('net_quantity'),
            total_amt=Sum(F('net_quantity') * F('price_per_liter'))
        )
        
        totals_dict = {t['customer']: t for t in totals}
        
        # Get daily breakdown
        daily_deliveries = deliveries.values('customer', 'ethiopian_day').annotate(
            qty=Sum('net_quantity')
        )
        
        daily_dict = {}
        for dd in daily_deliveries:
            cus_id = dd['customer']
            day = dd['ethiopian_day']
            if cus_id not in daily_dict:
                daily_dict[cus_id] = {}
            daily_dict[cus_id][day] = float(dd['qty'])

        result = []
        for c in customers:
            t = totals_dict.get(c.id, {'total_net': 0, 'total_amt': 0})
            data = CustomerSerializer(c).data
            data['current_period_milk'] = float(t.get('total_net') or 0)
            data['current_period_price'] = float(t.get('total_amt') or 0)
            data['period_name'] = str(period)
            data['period_start'] = period.start_date_ethiopian
            data['period_end'] = period.end_date_ethiopian
            data['has_record_today'] = c.id in today_delivered_customers
            data['daily_records'] = daily_dict.get(c.id, {})
            result.append(data)
            
        return Response(result)

    @action(detail=True, methods=['get'])
    def settlements_history(self, request, pk=None):
        customer = self.get_object()
        settlements = CustomerSettlement.objects.filter(customer=customer).order_by('-settlement_period__created_at')
        
        data = []
        for s in settlements:
            # Avoid division by zero
            milk = float(s.net_quantity)
            amt = float(s.gross_amount)
            unit_price = amt / milk if milk > 0 else 0
            
            data.append({
                'id': s.id,
                'period_id': s.settlement_period.id,
                'period_name': str(s.settlement_period),
                'start_date': s.settlement_period.start_date_ethiopian,
                'end_date': s.settlement_period.end_date_ethiopian,
                'total_milk': s.net_quantity,
                'unit_price_avg': round(unit_price, 2),
                'total_amount': s.final_amount,
                'amount_paid': s.amount_paid,
                'payment_status': s.payment_status,
                'status': s.settlement_period.status
            })
            
        return Response(data)
