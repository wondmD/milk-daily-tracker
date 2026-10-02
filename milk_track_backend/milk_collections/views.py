import datetime
from decimal import Decimal

from django.db import transaction
from ethiopian_date import EthiopianDateConverter
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from milk_inventory.coordination import lock_days, require_milk, save_or_duplicate, sync_ledger
from milk_inventory.models import MilkLedgerTransaction
from settlements.pricing import price_for_collection_date

from .models import MilkCollection
from .serializers import MilkCollectionSerializer


class MilkCollectionViewSet(viewsets.ModelViewSet):
    queryset = MilkCollection.objects.all().order_by('-created_at')
    serializer_class = MilkCollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        supplier = self.request.query_params.get('supplier')
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        serializer.validated_data['price_per_liter'] = price_for_collection_date(
            data['ethiopian_year'],
            data['ethiopian_month'],
            data['ethiopian_day'],
            data.get('price_per_liter'),
        )
        lock_days((data['ethiopian_year'], data['ethiopian_month'], data['ethiopian_day']))
        collection = save_or_duplicate(
            lambda: serializer.save(collection_worker=self.request.user),
            'This supplier already has a collection for that day. Update the existing record.',
        )

        _sync_collection_ledger(collection, self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        old_instance = self.get_object()
        _require_password_for_past_record(self.request, old_instance)

        old_date = (
            old_instance.ethiopian_year,
            old_instance.ethiopian_month,
            old_instance.ethiopian_day,
        )
        new_date = (
            serializer.validated_data.get('ethiopian_year', old_instance.ethiopian_year),
            serializer.validated_data.get('ethiopian_month', old_instance.ethiopian_month),
            serializer.validated_data.get('ethiopian_day', old_instance.ethiopian_day),
        )
        new_morning = Decimal(serializer.validated_data.get('morning_quantity', old_instance.morning_quantity))
        new_evening = Decimal(serializer.validated_data.get('evening_quantity', old_instance.evening_quantity))
        new_quantity = new_morning + new_evening
        old_quantity = old_instance.total_quantity

        lock_days(old_date, new_date)
        if old_date == new_date:
            if new_quantity < old_quantity:
                require_milk(*old_date, old_quantity - new_quantity)
        else:
            require_milk(*old_date, old_quantity)

        serializer.validated_data['price_per_liter'] = price_for_collection_date(
            *new_date,
            serializer.validated_data.get('price_per_liter', old_instance.price_per_liter),
        )

        new_instance = save_or_duplicate(
            serializer.save,
            'This supplier already has a collection for that day. Update the existing record.',
        )
        _sync_collection_ledger(new_instance, self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        _require_password_for_past_record(self.request, instance, allow_query=True)
        lock_days((instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day))
        require_milk(
            instance.ethiopian_year,
            instance.ethiopian_month,
            instance.ethiopian_day,
            instance.total_quantity,
        )
        sync_ledger(_collection_refs(instance.id), [])
        instance.delete()


def _collection_refs(collection_id):
    return [
        f'COL-{collection_id}',
        f'COL-ADJ-{collection_id}',
        f'COL-MOVE-IN-{collection_id}',
        f'COL-MOVE-OUT-{collection_id}',
        f'COL-DEL-{collection_id}',
    ]


def _sync_collection_ledger(collection, user):
    sync_ledger(_collection_refs(collection.id), [{
        'ethiopian_date': collection.ethiopian_date,
        'ethiopian_year': collection.ethiopian_year,
        'ethiopian_month': collection.ethiopian_month,
        'ethiopian_day': collection.ethiopian_day,
        'transaction_type': MilkLedgerTransaction.TransactionType.COLLECTION,
        'quantity': collection.total_quantity,
        'reference_id': f'COL-{collection.id}',
        'notes': f'Collection from {collection.supplier.name}',
        'recorded_by': user,
    }])


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
