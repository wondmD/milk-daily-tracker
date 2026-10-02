import datetime
from decimal import Decimal

from django.db import transaction
from ethiopian_date import EthiopianDateConverter
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from milk_inventory.coordination import lock_days, require_milk, save_or_duplicate, sync_ledger
from milk_inventory.models import MilkLedgerTransaction

from .models import MilkDelivery, MilkReturn
from .serializers import MilkDeliverySerializer, MilkReturnSerializer


class MilkDeliveryViewSet(viewsets.ModelViewSet):
    queryset = MilkDelivery.objects.all().order_by('-created_at')
    serializer_class = MilkDeliverySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        customer = self.request.query_params.get('customer')
        if customer:
            queryset = queryset.filter(customer_id=customer)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        day = (data['ethiopian_year'], data['ethiopian_month'], data['ethiopian_day'])
        delivered = Decimal(data.get('delivered_quantity') or 0)
        if not data.get('customer'):
            serializer.validated_data['customer'] = None
            serializer.validated_data['buyer_name'] = (data.get('buyer_name') or '').strip() or 'Walk-in'

        lock_days(day)
        require_milk(*day, delivered)

        delivery = save_or_duplicate(
            lambda: serializer.save(distribution_worker=self.request.user),
            'This customer already has a delivery for that day. Update the existing record.',
        )
        _sync_delivery_ledger(delivery, self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        old = self.get_object()
        _require_password_for_past_record(self.request, old)

        old_date = (old.ethiopian_year, old.ethiopian_month, old.ethiopian_day)
        new_date = (
            serializer.validated_data.get('ethiopian_year', old.ethiopian_year),
            serializer.validated_data.get('ethiopian_month', old.ethiopian_month),
            serializer.validated_data.get('ethiopian_day', old.ethiopian_day),
        )
        new_delivered = Decimal(serializer.validated_data.get('delivered_quantity', old.delivered_quantity))
        new_returned = Decimal(serializer.validated_data.get('returned_quantity', old.returned_quantity))

        lock_days(old_date, new_date)
        if old_date == new_date:
            extra = Decimal('0')
            if new_delivered > old.delivered_quantity:
                extra += new_delivered - old.delivered_quantity
            if new_returned < old.returned_quantity:
                extra += old.returned_quantity - new_returned
            require_milk(*old_date, extra)
        else:
            require_milk(*old_date, old.returned_quantity)
            require_milk(*new_date, new_delivered)

        updated = save_or_duplicate(
            serializer.save,
            'This customer already has a delivery for that day. Update the existing record.',
        )
        _sync_delivery_ledger(updated, self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        _require_password_for_past_record(self.request, instance, allow_query=True)
        lock_days((instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day))
        require_milk(
            instance.ethiopian_year,
            instance.ethiopian_month,
            instance.ethiopian_day,
            instance.returned_quantity,
        )
        sync_ledger(_delivery_refs(instance.id), [])
        instance.delete()


class MilkReturnViewSet(viewsets.ModelViewSet):
    queryset = MilkReturn.objects.all().order_by('-created_at')
    serializer_class = MilkReturnSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        lock_days((data['ethiopian_year'], data['ethiopian_month'], data['ethiopian_day']))
        milk_return = serializer.save(received_by=self.request.user)
        _ledger(
            milk_return.ethiopian_date, milk_return.ethiopian_year, milk_return.ethiopian_month, milk_return.ethiopian_day,
            milk_return.quantity, MilkLedgerTransaction.TransactionType.RETURN,
            f'RET-ISO-{milk_return.id}',
            f'Isolated return from {milk_return.customer.business_name}. Reason: {milk_return.reason}',
            self.request.user,
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        lock_days((instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day))
        require_milk(instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day, instance.quantity)
        sync_ledger([f'RET-ISO-{instance.id}', f'RET-DEL-{instance.id}'], [])
        instance.delete()


def _buyer_label(delivery):
    if delivery.customer_id:
        return delivery.customer.business_name
    return delivery.buyer_name or 'Walk-in'


def _delivery_refs(delivery_id):
    return [
        f'DEL-{delivery_id}',
        f'DEL-RET-{delivery_id}',
        f'DEL-ADJ-{delivery_id}',
        f'RET-ADJ-{delivery_id}',
        f'DEL-MOVE-{delivery_id}',
        f'DEL-MOVE-RET-{delivery_id}',
        f'DEL-MOVE-OUT-{delivery_id}',
        f'RET-MOVE-OUT-{delivery_id}',
        f'DEL-DEL-{delivery_id}',
        f'DEL-RET-DEL-{delivery_id}',
    ]


def _sync_delivery_ledger(delivery, user):
    entries = [{
        'ethiopian_date': delivery.ethiopian_date,
        'ethiopian_year': delivery.ethiopian_year,
        'ethiopian_month': delivery.ethiopian_month,
        'ethiopian_day': delivery.ethiopian_day,
        'transaction_type': MilkLedgerTransaction.TransactionType.DELIVERY,
        'quantity': -delivery.delivered_quantity,
        'reference_id': f'DEL-{delivery.id}',
        'notes': f'Delivery to {_buyer_label(delivery)}',
        'recorded_by': user,
    }]
    if delivery.returned_quantity and delivery.returned_quantity > 0:
        entries.append({
            'ethiopian_date': delivery.ethiopian_date,
            'ethiopian_year': delivery.ethiopian_year,
            'ethiopian_month': delivery.ethiopian_month,
            'ethiopian_day': delivery.ethiopian_day,
            'transaction_type': MilkLedgerTransaction.TransactionType.RETURN,
            'quantity': delivery.returned_quantity,
            'reference_id': f'DEL-RET-{delivery.id}',
            'notes': f'Return during delivery to {_buyer_label(delivery)}',
            'recorded_by': user,
        })
    sync_ledger(_delivery_refs(delivery.id), entries)


def _ledger(date_label, year, month, day, quantity, transaction_type, reference_id, notes, user):
    MilkLedgerTransaction.objects.create(
        ethiopian_date=date_label,
        ethiopian_year=year,
        ethiopian_month=month,
        ethiopian_day=day,
        transaction_type=transaction_type,
        quantity=quantity,
        reference_id=reference_id,
        notes=notes,
        recorded_by=user,
    )


def _require_password_for_past_record(request, instance, allow_query=False):
    today = datetime.date.today()
    eth_today = EthiopianDateConverter.date_to_ethiopian(today)
    is_past_record = (
        instance.ethiopian_year != eth_today.year
        or instance.ethiopian_month != eth_today.month
        or instance.ethiopian_day != eth_today.day
    )
    if not is_past_record:
        return

    admin_password = request.data.get('admin_password')
    if allow_query and not admin_password:
        admin_password = request.query_params.get('admin_password')
    if not admin_password:
        raise ValidationError({'admin_password': 'Password is required to edit past records.'})
    if not request.user.check_password(admin_password):
        raise ValidationError({'admin_password': 'Invalid password.'})
