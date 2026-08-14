from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import MilkCollection
from .serializers import MilkCollectionSerializer
from milk_inventory.models import MilkLedgerTransaction
from django.db import transaction
from rest_framework.exceptions import ValidationError
from ethiopian_date import EthiopianDateConverter
import datetime
from core.models import SystemSettings

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
        if 'price_per_liter' not in serializer.validated_data:
            settings = SystemSettings.load()
            serializer.validated_data['price_per_liter'] = settings.default_supplier_milk_price

        collection = serializer.save(collection_worker=self.request.user)
        
        # Log to ledger
        MilkLedgerTransaction.objects.create(
            ethiopian_date=collection.ethiopian_date,
            ethiopian_year=collection.ethiopian_year,
            ethiopian_month=collection.ethiopian_month,
            ethiopian_day=collection.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.COLLECTION,
            quantity=collection.total_quantity,  # positive because milk comes in
            reference_id=f"COL-{collection.id}",
            notes=f"Collection from {collection.supplier.name}",
            recorded_by=self.request.user
        )

    @transaction.atomic
    def perform_update(self, serializer):
        old_instance = self.get_object()
        
        # Check if this is a past record
        today = datetime.date.today()
        eth_today = EthiopianDateConverter.date_to_ethiopian(today)
        is_past_record = (
            old_instance.ethiopian_year != eth_today.year or 
            old_instance.ethiopian_month != eth_today.month or 
            old_instance.ethiopian_day != eth_today.day
        )
        
        if is_past_record:
            admin_password = self.request.data.get('admin_password')
            if not admin_password:
                raise ValidationError({"admin_password": "Password is required to edit past records."})
            if not self.request.user.check_password(admin_password):
                raise ValidationError({"admin_password": "Invalid password."})

        # We need to calculate the diff for the ledger
        old_quantity = old_instance.total_quantity
        
        if 'price_per_liter' not in serializer.validated_data and old_instance.price_per_liter == 0:
            settings = SystemSettings.load()
            serializer.validated_data['price_per_liter'] = settings.default_supplier_milk_price
            
        new_instance = serializer.save()
        new_quantity = new_instance.total_quantity
        
        quantity_diff = new_quantity - old_quantity
        
        if quantity_diff != 0:
            MilkLedgerTransaction.objects.create(
                ethiopian_date=new_instance.ethiopian_date,
                ethiopian_year=new_instance.ethiopian_year,
                ethiopian_month=new_instance.ethiopian_month,
                ethiopian_day=new_instance.ethiopian_day,
                transaction_type=MilkLedgerTransaction.TransactionType.ADJUSTMENT,
                quantity=quantity_diff,
                reference_id=f"COL-ADJ-{new_instance.id}",
                notes=f"Adjustment for collection update",
                recorded_by=self.request.user
            )

    @transaction.atomic
    def perform_destroy(self, instance):
        # Check if this is a past record
        today = datetime.date.today()
        eth_today = EthiopianDateConverter.date_to_ethiopian(today)
        is_past_record = (
            instance.ethiopian_year != eth_today.year or 
            instance.ethiopian_month != eth_today.month or 
            instance.ethiopian_day != eth_today.day
        )
        
        if is_past_record:
            # Need to get password from request. Query params for DELETE or body?
            # DRF doesn't typically send body for DELETE, but it can. We'll check query_params and data.
            admin_password = self.request.data.get('admin_password') or self.request.query_params.get('admin_password')
            if not admin_password:
                raise ValidationError({"admin_password": "Password is required to delete past records."})
            if not self.request.user.check_password(admin_password):
                raise ValidationError({"admin_password": "Invalid password."})

        # Revert ledger
        MilkLedgerTransaction.objects.create(
            ethiopian_date=instance.ethiopian_date,
            ethiopian_year=instance.ethiopian_year,
            ethiopian_month=instance.ethiopian_month,
            ethiopian_day=instance.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.ADJUSTMENT,
            quantity=-instance.total_quantity, # negative because we are removing milk that was previously collected
            reference_id=f"COL-DEL-{instance.id}",
            notes=f"Reversal due to collection deletion",
            recorded_by=self.request.user
        )
        
        instance.delete()
