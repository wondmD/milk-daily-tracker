"""Recalculate settlements without losing a concurrent payment or advance.

Lock order, after any milk-pool locks the caller already holds:
1. SettlementPeriod rows, by primary key
2. Supplier or Customer rows, by primary key
3. The settlement row and that supplier's advances

Apply order follows the keys the caller passes. Pass the previous party and
date before the new one so a moved collection releases the old period before
the new period claims its advances.
"""

from dataclasses import dataclass
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F, Q, Sum
from rest_framework.exceptions import ValidationError

from customers.models import Customer
from distributions.models import MilkDelivery
from milk_collections.models import MilkCollection
from payments.models import SupplierAdvance
from suppliers.models import Supplier

from .models import CustomerSettlement, SettlementPeriod, SupplierSettlement

MONTHS = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
]


@dataclass(frozen=True)
class PeriodSpec:
    year: int
    month: int
    number: int
    start_date: str
    end_date: str


def period_spec(year, month, day):
    year, month, day = int(year), int(month), int(day)
    if month < 1 or month > 13:
        raise ValidationError({'ethiopian_month': 'Month must be between 1 and 13.'})

    name = MONTHS[month - 1]
    if month == 13:
        number = 1
        start = f'{name} 1, {year}'
        end = f'{name} 6, {year}'
    elif day <= 15:
        number = 1
        start = f'{name} 1, {year}'
        end = f'{name} 15, {year}'
    else:
        number = 2
        start = f'{name} 16, {year}'
        end = f'{name} 30, {year}'
    return PeriodSpec(year, month, number, start, end)


def refresh_supplier_settlement(supplier_id, year, month, day):
    refresh_supplier_settlements([(supplier_id, year, month, day)])


def refresh_supplier_settlements(keys):
    _refresh(keys, party='supplier')


def refresh_period_from_records(period):
    """Rebuild settlement totals for one period from collections and deliveries."""
    anchor_day = 1 if period.period_number == 1 or period.ethiopian_month == 13 else 16
    supplier_ids = _parties_in_period(MilkCollection, 'supplier_id', period)
    if supplier_ids:
        refresh_supplier_settlements([
            (supplier_id, period.ethiopian_year, period.ethiopian_month, anchor_day)
            for supplier_id in supplier_ids
        ])
    customer_ids = _parties_in_period(MilkDelivery, 'customer_id', period, skip_null=True)
    if customer_ids:
        refresh_customer_settlements([
            (customer_id, period.ethiopian_year, period.ethiopian_month, anchor_day)
            for customer_id in customer_ids
        ])


def _parties_in_period(model, field, period, skip_null=False):
    records = model.objects.filter(
        ethiopian_year=period.ethiopian_year,
        ethiopian_month=period.ethiopian_month,
    )
    if skip_null:
        records = records.filter(**{f'{field}__isnull': False})
    if period.ethiopian_month == 13 or period.period_number == 1:
        records = records.filter(ethiopian_day__lte=15)
    else:
        records = records.filter(ethiopian_day__gt=15)
    return list(records.values_list(field, flat=True).distinct())


def refresh_customer_settlement(customer_id, year, month, day):
    refresh_customer_settlements([(customer_id, year, month, day)])


def refresh_customer_settlements(keys):
    _refresh(keys, party='customer')


def apply_settlement_payment(kind, settlement_id, amount):
    """Add (or subtract) a payment while holding the settlement row."""
    model = SupplierSettlement if kind == 'supplier' else CustomerSettlement
    delta = Decimal(amount)
    with transaction.atomic():
        try:
            settlement = model.objects.select_for_update().get(pk=settlement_id)
        except model.DoesNotExist:
            return

        if delta > 0 and delta > settlement.remaining_balance:
            raise ValidationError({
                'amount': (
                    f'Payment exceeds the remaining balance of {settlement.remaining_balance} ETB.'
                )
            })

        settlement.amount_paid = max(Decimal('0'), settlement.amount_paid + delta)
        _store_balance(settlement)


def _refresh(keys, party):
    ordered = []
    for supplier_or_customer_id, year, month, day in keys:
        key = (supplier_or_customer_id, int(year), int(month), int(day))
        if key not in ordered:
            ordered.append(key)
    if not ordered:
        return

    with transaction.atomic():
        specs = [(party_id, period_spec(year, month, day)) for party_id, year, month, day in ordered]
        periods = _lock_periods(spec for _, spec in specs)
        _lock_parties(party, {party_id for party_id, _ in specs})

        applied = set()
        for party_id, spec in specs:
            token = (party_id, spec.year, spec.month, spec.number)
            if token in applied:
                continue
            applied.add(token)
            period = periods[(spec.year, spec.month, spec.number)]
            if party == 'supplier':
                _apply_supplier(party_id, period)
            else:
                _apply_customer(party_id, period)


def _lock_periods(specs):
    unique = {}
    for spec in specs:
        unique.setdefault((spec.year, spec.month, spec.number), spec)

    ensured = [_ensure_period(spec) for spec in unique.values()]
    locked = {}
    for period in sorted(ensured, key=lambda row: row.pk):
        current = SettlementPeriod.objects.select_for_update().get(pk=period.pk)
        locked[(current.ethiopian_year, current.ethiopian_month, current.period_number)] = current
    return locked


def _lock_parties(party, ids):
    model = Supplier if party == 'supplier' else Customer
    for party_id in sorted(ids):
        model.objects.select_for_update().get(pk=party_id)


def _ensure_period(spec):
    try:
        return SettlementPeriod.objects.get(
            ethiopian_year=spec.year,
            ethiopian_month=spec.month,
            period_number=spec.number,
        )
    except SettlementPeriod.DoesNotExist:
        try:
            with transaction.atomic():
                return SettlementPeriod.objects.create(
                    ethiopian_year=spec.year,
                    ethiopian_month=spec.month,
                    period_number=spec.number,
                    start_date_ethiopian=spec.start_date,
                    end_date_ethiopian=spec.end_date,
                )
        except IntegrityError:
            return SettlementPeriod.objects.get(
                ethiopian_year=spec.year,
                ethiopian_month=spec.month,
                period_number=spec.number,
            )


def _period_queryset(model, party_field, party_id, period):
    records = model.objects.filter(
        **{
            party_field: party_id,
            'ethiopian_year': period.ethiopian_year,
            'ethiopian_month': period.ethiopian_month,
        }
    )
    if period.ethiopian_month == 13 or period.period_number == 1:
        return records.filter(ethiopian_day__lte=15)
    return records.filter(ethiopian_day__gt=15)


def _apply_supplier(supplier_id, period):
    totals = _period_queryset(MilkCollection, 'supplier_id', supplier_id, period).aggregate(
        total_qty=Sum('total_quantity'),
        total_amt=Sum(F('total_quantity') * F('price_per_liter')),
    )
    total_qty = totals['total_qty'] or Decimal('0')
    total_amt = totals['total_amt'] or Decimal('0')

    advances = SupplierAdvance.objects.select_for_update().filter(supplier_id=supplier_id).filter(
        Q(status=SupplierAdvance.Status.PENDING) |
        Q(status=SupplierAdvance.Status.DEDUCTED, settlement_period=period)
    ).order_by('id')

    settlement = SupplierSettlement.objects.select_for_update().filter(
        supplier_id=supplier_id,
        settlement_period=period,
    ).first()

    if total_qty <= 0:
        advances.filter(
            status=SupplierAdvance.Status.DEDUCTED,
            settlement_period=period,
        ).update(status=SupplierAdvance.Status.PENDING, settlement_period=None)
        if settlement is None:
            return
        if settlement.amount_paid <= 0:
            settlement.delete()
            return
        settlement.total_milk_collected = Decimal('0')
        settlement.gross_amount = Decimal('0')
        settlement.adjustments = Decimal('0')
        settlement.final_amount = Decimal('0')
        _store_balance(settlement)
        return

    total_advances = advances.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    if settlement is None:
        settlement = _create_supplier_settlement(supplier_id, period)

    settlement.total_milk_collected = total_qty
    settlement.gross_amount = total_amt
    settlement.adjustments = total_advances
    settlement.final_amount = total_amt - total_advances
    _store_balance(settlement)
    advances.update(status=SupplierAdvance.Status.DEDUCTED, settlement_period=period)


def _apply_customer(customer_id, period):
    totals = _period_queryset(MilkDelivery, 'customer_id', customer_id, period).aggregate(
        tot_del=Sum('delivered_quantity'),
        tot_ret=Sum('returned_quantity'),
        tot_net=Sum('net_quantity'),
        tot_amt=Sum(F('net_quantity') * F('price_per_liter')),
    )
    total_delivered = totals['tot_del'] or Decimal('0')
    total_returned = totals['tot_ret'] or Decimal('0')
    net_quantity = totals['tot_net'] or Decimal('0')
    gross_amount = totals['tot_amt'] or Decimal('0')

    settlement = CustomerSettlement.objects.select_for_update().filter(
        customer_id=customer_id,
        settlement_period=period,
    ).first()

    if total_delivered <= 0 and net_quantity <= 0:
        if settlement is None:
            return
        if settlement.amount_paid <= 0:
            settlement.delete()
            return
        settlement.total_delivered = Decimal('0')
        settlement.total_returned = Decimal('0')
        settlement.net_quantity = Decimal('0')
        settlement.gross_amount = Decimal('0')
        settlement.final_amount = Decimal('0')
        _store_balance(settlement)
        return

    if settlement is None:
        settlement = _create_customer_settlement(customer_id, period)

    settlement.total_delivered = total_delivered
    settlement.total_returned = total_returned
    settlement.net_quantity = net_quantity
    settlement.gross_amount = gross_amount
    settlement.final_amount = gross_amount
    _store_balance(settlement)


def _create_supplier_settlement(supplier_id, period):
    try:
        with transaction.atomic():
            return SupplierSettlement.objects.create(
                supplier_id=supplier_id,
                settlement_period=period,
            )
    except IntegrityError:
        return SupplierSettlement.objects.select_for_update().get(
            supplier_id=supplier_id,
            settlement_period=period,
        )


def _create_customer_settlement(customer_id, period):
    try:
        with transaction.atomic():
            return CustomerSettlement.objects.create(
                customer_id=customer_id,
                settlement_period=period,
            )
    except IntegrityError:
        return CustomerSettlement.objects.select_for_update().get(
            customer_id=customer_id,
            settlement_period=period,
        )


def _store_balance(settlement):
    settlement.remaining_balance = settlement.final_amount - settlement.amount_paid
    paid = settlement.amount_paid
    remaining = settlement.remaining_balance
    status = settlement.PaymentStatus
    if remaining <= 0 and paid > 0:
        settlement.payment_status = status.PAID
    elif paid > 0:
        settlement.payment_status = status.PARTIALLY_PAID
    else:
        settlement.payment_status = status.UNPAID
    settlement.save()
