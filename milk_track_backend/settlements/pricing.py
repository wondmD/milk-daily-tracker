"""Supplier price is one number for a 15-day period. Customer price is per customer."""

from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.models import SystemSettings
from customers.models import Customer
from distributions.models import MilkDelivery
from milk_collections.models import MilkCollection

from .coordination import period_spec, refresh_customer_settlement, refresh_period_from_records
from .models import SettlementPeriod


def price_for_collection_date(year, month, day, posted=None):
    """Every supplier collection on this date uses the period's supplier price."""
    period = period_for_date(year, month, day)
    if period.supplier_price and period.supplier_price > 0:
        return period.supplier_price

    chosen = _optional_positive(posted)
    if chosen is None:
        fallback = SystemSettings.load().default_supplier_milk_price
        if fallback and fallback > 0:
            chosen = fallback
    if chosen is not None:
        period.supplier_price = chosen
        period.save(update_fields=['supplier_price'])
        return chosen
    return Decimal('0')


def apply_period_supplier_price(period, price):
    price = _positive_price(price)
    with transaction.atomic():
        period.supplier_price = price
        period.save(update_fields=['supplier_price'])
        _collections(period).update(price_per_liter=price)
        refresh_period_from_records(period)
    period.refresh_from_db()
    return period


def apply_customer_period_price(settlement, price):
    """Change one customer's selling price for this period only."""
    price = _positive_price(price)
    period = settlement.settlement_period
    anchor_day = 1 if period.period_number == 1 or period.ethiopian_month == 13 else 16
    with transaction.atomic():
        _deliveries(period).filter(customer_id=settlement.customer_id).update(price_per_liter=price)
        Customer.objects.filter(pk=settlement.customer_id).update(default_milk_price=price)
        refresh_customer_settlement(
            settlement.customer_id,
            period.ethiopian_year,
            period.ethiopian_month,
            anchor_day,
        )
    settlement.refresh_from_db()
    return settlement


def period_for_date(year, month, day):
    spec = period_spec(year, month, day)
    return SettlementPeriod._get_or_create_period(
        spec.year, spec.month, spec.number, spec.start_date, spec.end_date,
    )


def _collections(period):
    return _dated(MilkCollection.objects.all(), period)


def _deliveries(period):
    return _dated(MilkDelivery.objects.all(), period)


def _dated(queryset, period):
    queryset = queryset.filter(
        ethiopian_year=period.ethiopian_year,
        ethiopian_month=period.ethiopian_month,
    )
    if period.ethiopian_month == 13 or period.period_number == 1:
        return queryset.filter(ethiopian_day__lte=15)
    return queryset.filter(ethiopian_day__gt=15)


def _optional_positive(price):
    if price in (None, ''):
        return None
    try:
        amount = Decimal(str(price))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if amount <= 0:
        return None
    return amount


def _positive_price(price):
    try:
        amount = Decimal(str(price))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({'price': 'Enter a valid price.'})
    if amount <= 0:
        raise ValidationError({'price': 'Price must be greater than zero.'})
    return amount
