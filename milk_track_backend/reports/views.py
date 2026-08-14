from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from settlements.models import SettlementPeriod, SupplierSettlement, CustomerSettlement
from expenses.models import Expense
import datetime
from ethiopian_date import EthiopianDateConverter
from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery

class TrendSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = request.query_params.get('days', 14)
        try:
            days = int(days)
        except ValueError:
            days = 14

        # Get the distinct dates from Collections in descending order
        recent_dates = MilkCollection.objects.values('ethiopian_year', 'ethiopian_month', 'ethiopian_day', 'ethiopian_date')\
                                     .annotate(collected=Sum('total_quantity'))\
                                     .order_by('-ethiopian_year', '-ethiopian_month', '-ethiopian_day')[:days]

        # For these dates, get the corresponding deliveries
        results = []
        for d in recent_dates:
            deliveries = MilkDelivery.objects.filter(
                ethiopian_year=d['ethiopian_year'],
                ethiopian_month=d['ethiopian_month'],
                ethiopian_day=d['ethiopian_day']
            ).aggregate(delivered=Sum('net_quantity'))['delivered'] or 0
            
            results.append({
                'date': d['ethiopian_date'],
                'day': d['ethiopian_day'],
                'month': d['ethiopian_month'],
                'collected': float(d['collected']),
                'delivered': float(deliveries)
            })

        # Return in chronological order
        return Response(list(reversed(results)))

class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not year or not month:
            # Default to current Ethiopian month
            today = datetime.date.today()
            d = EthiopianDateConverter.date_to_ethiopian(today)
            year, month = d.year, d.month
        else:
            year, month = int(year), int(month)
            
        periods = SettlementPeriod.objects.filter(ethiopian_year=year, ethiopian_month=month)
        
        # Monthly Revenue from Customer Settlements
        customer_settlements = CustomerSettlement.objects.filter(settlement_period__in=periods)
        revenue = customer_settlements.aggregate(total=Sum('final_amount'))['total'] or 0
        
        # Monthly Supplier Payments
        supplier_settlements = SupplierSettlement.objects.filter(settlement_period__in=periods)
        supplier_payments = supplier_settlements.aggregate(total=Sum('final_amount'))['total'] or 0
        
        # Operational Expenses
        expenses = Expense.objects.filter(ethiopian_year=year, ethiopian_month=month)
        operational_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        total_expenses = supplier_payments + operational_expenses
        net_margin = revenue - total_expenses
        
        return Response({
            'year': year,
            'month': month,
            'revenue': float(revenue),
            'supplier_payments': float(supplier_payments),
            'operational_expenses': float(operational_expenses),
            'total_expenses': float(total_expenses),
            'net_margin': float(net_margin)
        })
