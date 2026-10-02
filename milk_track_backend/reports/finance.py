"""Sales, milk cost, and profit from the records themselves.

Settlement rows are refreshed first so unpaid balances match those records.
Profit is sales minus the milk's purchase cost minus operating expenses.
A supplier advance changes what is still payable, not what the milk cost.
"""

from decimal import Decimal

import datetime
from django.db.models import F, Sum
from ethiopian_date import EthiopianDateConverter

from distributions.models import MilkDelivery
from expenses.models import Expense
from milk_collections.models import MilkCollection
from milk_inventory.models import MilkWastage
from processing.models import ProcessingBatch
from settlements.coordination import refresh_period_from_records
from settlements.models import CustomerSettlement, SettlementPeriod, SupplierSettlement


def build_operations_dashboard():
    today = datetime.date.today()
    eth = EthiopianDateConverter.date_to_ethiopian(today)
    period = SettlementPeriod.ensure_current_period()
    refresh_period_from_records(period)
    finance = _finance_for_span(period.ethiopian_year, period.ethiopian_month, _period_day_bounds(period))
    milk = _milk_for_day(eth.year, eth.month, eth.day)
    return {
        'date': {'year': eth.year, 'month': eth.month, 'day': eth.day},
        'period': {
            'id': period.id,
            'year': period.ethiopian_year,
            'month': period.ethiopian_month,
            'period_number': period.period_number,
            'start': period.start_date_ethiopian,
            'end': period.end_date_ethiopian,
        },
        'milk': milk,
        'finance': finance,
    }


def build_month_summary(year, month):
    year, month = int(year), int(month)
    for period in SettlementPeriod.objects.filter(ethiopian_year=year, ethiopian_month=month):
        refresh_period_from_records(period)
    finance = _finance_for_span(year, month, None)
    return {'year': year, 'month': month, **finance}


def build_trend(days):
    collection_days = MilkCollection.objects.values(
        'ethiopian_year', 'ethiopian_month', 'ethiopian_day'
    )
    delivery_days = MilkDelivery.objects.values(
        'ethiopian_year', 'ethiopian_month', 'ethiopian_day'
    )
    keys = {
        (row['ethiopian_year'], row['ethiopian_month'], row['ethiopian_day'])
        for row in collection_days.union(delivery_days)
    }
    recent = sorted(keys, reverse=True)[:days]
    results = []
    for year, month, day in recent:
        collected = _sum(
            MilkCollection.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
            'total_quantity',
        )
        delivered = _sum(
            MilkDelivery.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
            'net_quantity',
        )
        results.append({
            'date': f'{year}-{month:02d}-{day:02d}',
            'day': day,
            'month': month,
            'collected': float(collected),
            'delivered': float(delivered),
        })
    return list(reversed(results))


def build_top_suppliers(year, month, limit):
    collections = MilkCollection.objects.filter(
        ethiopian_year=year,
        ethiopian_month=month,
    ).values('supplier__name').annotate(
        total_volume=Sum('total_quantity')
    ).order_by('-total_volume')[:limit]
    return [
        {'name': row['supplier__name'], 'volume': float(row['total_volume'] or 0)}
        for row in collections
    ]


def _finance_for_span(year, month, day_bounds):
    deliveries = _dated(MilkDelivery.objects.all(), year, month, day_bounds)
    collections = _dated(MilkCollection.objects.all(), year, month, day_bounds)
    expenses = _dated(Expense.objects.all(), year, month, day_bounds)
    walk_ins = deliveries.filter(customer__isnull=True)

    sales = _sum_expr(deliveries, F('net_quantity') * F('price_per_liter'))
    walk_in_sales = _sum_expr(walk_ins, F('net_quantity') * F('price_per_liter'))
    milk_cost = _sum_expr(collections, F('total_quantity') * F('price_per_liter'))
    operating_expenses = _sum(expenses, 'amount')

    periods = SettlementPeriod.objects.filter(ethiopian_year=year, ethiopian_month=month)
    if day_bounds is not None:
        period_number = 1 if day_bounds[1] <= 15 else 2
        periods = periods.filter(period_number=period_number)
    receivable = _sum(
        CustomerSettlement.objects.filter(settlement_period__in=periods),
        'remaining_balance',
    )
    payable = _sum(
        SupplierSettlement.objects.filter(settlement_period__in=periods),
        'remaining_balance',
    )
    profit = sales - milk_cost - operating_expenses
    return {
        'sales': float(sales),
        'walk_in_sales': float(walk_in_sales),
        'milk_cost': float(milk_cost),
        'operational_expenses': float(operating_expenses),
        'receivable': float(receivable),
        'payable': float(payable),
        'profit': float(profit),
        # Names the reports screen already reads.
        'revenue': float(sales),
        'supplier_payments': float(milk_cost),
        'total_expenses': float(milk_cost + operating_expenses),
        'net_margin': float(profit),
    }


def _milk_for_day(year, month, day):
    collected = _sum(
        MilkCollection.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
        'total_quantity',
    )
    delivered = _sum(
        MilkDelivery.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
        'delivered_quantity',
    )
    returned = _sum(
        MilkDelivery.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
        'returned_quantity',
    )
    processed = _sum(
        ProcessingBatch.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
        'input_milk_quantity',
    )
    wasted = _sum(
        MilkWastage.objects.filter(ethiopian_year=year, ethiopian_month=month, ethiopian_day=day),
        'quantity',
    )
    on_hand = collected + returned - delivered - processed - wasted
    return {
        'collected': float(collected),
        'delivered': float(delivered),
        'returned': float(returned),
        'processed': float(processed),
        'wasted': float(wasted),
        'on_hand': float(on_hand),
    }


def period_statement(period):
    """Revenue, cost, and profit for one 15-day settlement period."""
    finance = _finance_for_span(
        period.ethiopian_year,
        period.ethiopian_month,
        _period_day_bounds(period),
    )
    return {
        'revenue': finance['revenue'],
        'milk_cost': finance['milk_cost'],
        'expenses': finance['operational_expenses'],
        'total_cost': finance['total_expenses'],
        'profit': finance['profit'],
    }


def _period_day_bounds(period):
    if period.ethiopian_month == 13 or period.period_number == 1:
        return (1, 15)
    return (16, 30)


def _dated(queryset, year, month, day_bounds):
    queryset = queryset.filter(ethiopian_year=year, ethiopian_month=month)
    if day_bounds is None:
        return queryset
    start, end = day_bounds
    return queryset.filter(ethiopian_day__gte=start, ethiopian_day__lte=end)


def _sum(queryset, field):
    total = queryset.aggregate(total=Sum(field))['total']
    return total if total is not None else Decimal('0')


def _sum_expr(queryset, expression):
    total = queryset.aggregate(total=Sum(expression))['total']
    return total if total is not None else Decimal('0')
