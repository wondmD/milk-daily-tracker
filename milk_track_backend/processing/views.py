from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Product, ProductInventory, ProcessingBatch
from .serializers import ProductSerializer, ProductInventorySerializer, ProcessingBatchSerializer
from milk_inventory.models import MilkLedgerTransaction

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        product = serializer.save()
        # Automatically create inventory record for new product
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
        batch = serializer.save(recorded_by=self.request.user)
        
        # Log to milk ledger (negative because milk is used up/processed)
        MilkLedgerTransaction.objects.create(
            ethiopian_date=batch.ethiopian_date,
            ethiopian_year=batch.ethiopian_year,
            ethiopian_month=batch.ethiopian_month,
            ethiopian_day=batch.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.PROCESSING,
            quantity=-batch.input_milk_quantity,
            reference_id=f"PROC-{batch.id}",
            notes=f"Processed into {batch.product.name}",
            recorded_by=self.request.user
        )
        
        # Add output to product inventory
        inventory = ProductInventory.objects.get(product=batch.product)
        inventory.quantity_available += batch.output_quantity
        inventory.save()
