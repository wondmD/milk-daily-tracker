from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from milk_inventory.coordination import lock_days, require_milk, sync_ledger
from milk_inventory.models import MilkLedgerTransaction

from .models import ProcessingBatch, Product, ProductInventory
from .serializers import ProcessingBatchSerializer, ProductInventorySerializer, ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        product = serializer.save()
        ProductInventory.objects.create(product=product, quantity_available=0)


class ProductInventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductInventory.objects.all()
    serializer_class = ProductInventorySerializer
    permission_classes = [IsAuthenticated]


class ProcessingBatchViewSet(viewsets.ModelViewSet):
    queryset = ProcessingBatch.objects.all().order_by('-created_at')
    serializer_class = ProcessingBatchSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        day = (data['ethiopian_year'], data['ethiopian_month'], data['ethiopian_day'])
        lock_days(day)
        require_milk(*day, data['input_milk_quantity'])

        batch = serializer.save(recorded_by=self.request.user)
        _sync_processing_ledger(batch, self.request.user)
        _adjust_inventory(batch.product, batch.output_quantity)

    @transaction.atomic
    def perform_update(self, serializer):
        old = self.get_object()
        old_date = (old.ethiopian_year, old.ethiopian_month, old.ethiopian_day)
        new_date = (
            serializer.validated_data.get('ethiopian_year', old.ethiopian_year),
            serializer.validated_data.get('ethiopian_month', old.ethiopian_month),
            serializer.validated_data.get('ethiopian_day', old.ethiopian_day),
        )
        new_input = Decimal(serializer.validated_data.get('input_milk_quantity', old.input_milk_quantity))
        new_output = Decimal(serializer.validated_data.get('output_quantity', old.output_quantity))
        new_product = serializer.validated_data.get('product', old.product)

        lock_days(old_date, new_date)
        if old_date == new_date:
            if new_input > old.input_milk_quantity:
                require_milk(*old_date, new_input - old.input_milk_quantity)
        else:
            require_milk(*new_date, new_input)

        if new_product.pk == old.product_id:
            _adjust_inventory(old.product, new_output - old.output_quantity)
        else:
            _adjust_inventory(old.product, -old.output_quantity)
            _adjust_inventory(new_product, new_output)

        batch = serializer.save()
        _sync_processing_ledger(batch, self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        lock_days((instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day))
        _adjust_inventory(instance.product, -instance.output_quantity)
        sync_ledger(_processing_refs(instance.id), [])
        instance.delete()


def _adjust_inventory(product, delta):
    delta = Decimal(delta or 0)
    if delta == 0:
        return

    inventory = ProductInventory.objects.filter(product=product).first()
    if inventory is None:
        try:
            with transaction.atomic():
                inventory = ProductInventory.objects.create(product=product, quantity_available=0)
        except IntegrityError:
            inventory = ProductInventory.objects.get(product=product)

    inventory = ProductInventory.objects.select_for_update().get(pk=inventory.pk)
    if delta < 0 and inventory.quantity_available + delta < 0:
        raise ValidationError({
            'output_quantity': (
                f'Cannot remove {abs(delta)} {product.unit} of {product.name}. '
                f'Only {inventory.quantity_available} on hand.'
            )
        })
    ProductInventory.objects.filter(pk=inventory.pk).update(
        quantity_available=F('quantity_available') + delta
    )


def _processing_refs(batch_id):
    return [
        f'PROC-{batch_id}',
        f'PROC-ADJ-{batch_id}',
        f'PROC-MOVE-IN-{batch_id}',
        f'PROC-MOVE-OUT-{batch_id}',
        f'PROC-DEL-{batch_id}',
    ]


def _sync_processing_ledger(batch, user):
    sync_ledger(_processing_refs(batch.id), [{
        'ethiopian_date': batch.ethiopian_date,
        'ethiopian_year': batch.ethiopian_year,
        'ethiopian_month': batch.ethiopian_month,
        'ethiopian_day': batch.ethiopian_day,
        'transaction_type': MilkLedgerTransaction.TransactionType.PROCESSING,
        'quantity': -batch.input_milk_quantity,
        'reference_id': f'PROC-{batch.id}',
        'notes': f'Processed into {batch.product.name}',
        'recorded_by': user,
    }])
