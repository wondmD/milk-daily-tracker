"""Serialize milk movements for one Ethiopian day.

Lock order for any request that both moves milk and updates money:
1. DailyMilkPool rows, by primary key
2. Settlement periods and parties (see settlements.coordination)

Callers must already be inside transaction.atomic(). The pool lock is held
until that transaction commits, so a second worker waits and then sees the
updated ledger instead of the balance this worker started with.
"""

from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from .models import DailyMilkPool, MilkLedgerTransaction


def save_or_duplicate(action, message):
    try:
        with transaction.atomic():
            return action()
    except IntegrityError as exc:
        raise ValidationError({'non_field_errors': [message]}) from exc


def lock_days(*dates):
    if not transaction.get_connection().in_atomic_block:
        raise RuntimeError('lock_days() must run inside transaction.atomic()')

    unique_dates = []
    for raw in dates:
        key = (int(raw[0]), int(raw[1]), int(raw[2]))
        if key not in unique_dates:
            unique_dates.append(key)
    unique_dates.sort()

    pools = [_ensure_pool(*key) for key in unique_dates]
    return [
        DailyMilkPool.objects.select_for_update().get(pk=pool.pk)
        for pool in sorted(pools, key=lambda pool: pool.pk)
    ]


def available_liters(year, month, day):
    total = MilkLedgerTransaction.objects.filter(
        ethiopian_year=year,
        ethiopian_month=month,
        ethiopian_day=day,
    ).aggregate(total=Sum('quantity'))['total']
    return total if total is not None else Decimal('0')


def require_milk(year, month, day, liters):
    """Reject an outflow that would drive this day's pool below zero."""
    requested = Decimal(liters or 0)
    if requested <= 0:
        return Decimal('0')

    available = available_liters(year, month, day)
    if available < requested:
        raise ValidationError({
            'quantity': (
                f'Not enough milk on {year}-{month}-{day}. '
                f'{available} L available, {requested} L requested.'
            )
        })
    return available


def sync_ledger(references, entries):
    """Replace every ledger row for a source record with its current state.

    Reconciliation reads collection, delivery, and processing totals by type.
    Stacking adjustment rows leaves those totals stale after an edit.
    """
    MilkLedgerTransaction.objects.filter(reference_id__in=list(references)).delete()
    for entry in entries:
        MilkLedgerTransaction.objects.create(**entry)


def _ensure_pool(year, month, day):
    existing = DailyMilkPool.objects.filter(
        ethiopian_year=year,
        ethiopian_month=month,
        ethiopian_day=day,
    ).first()
    if existing is not None:
        return existing

    try:
        with transaction.atomic():
            return DailyMilkPool.objects.create(
                ethiopian_year=year,
                ethiopian_month=month,
                ethiopian_day=day,
            )
    except IntegrityError:
        return DailyMilkPool.objects.get(
            ethiopian_year=year,
            ethiopian_month=month,
            ethiopian_day=day,
        )
