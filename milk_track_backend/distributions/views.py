from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import MilkDelivery, MilkReturn
from .serializers import MilkDeliverySerializer, MilkReturnSerializer
from milk_inventory.models import MilkLedgerTransaction
from django.db import transaction
from rest_framework.exceptions import ValidationError
from ethiopian_date import EthiopianDateConverter
import datetime

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
        delivery = serializer.save(distribution_worker=self.request.user)
        
        # Log to ledger (negative because milk goes out)
        MilkLedgerTransaction.objects.create(
            ethiopian_date=delivery.ethiopian_date,
            ethiopian_year=delivery.ethiopian_year,
            ethiopian_month=delivery.ethiopian_month,
            ethiopian_day=delivery.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.DELIVERY,
            quantity=-delivery.delivered_quantity,
            reference_id=f"DEL-{delivery.id}",
            notes=f"Delivery to {delivery.customer.business_name}",
            recorded_by=self.request.user
        )
        
        # If there are returns at the time of delivery, they also come back in
        if delivery.returned_quantity > 0:
            MilkLedgerTransaction.objects.create(
                ethiopian_date=delivery.ethiopian_date,
                ethiopian_year=delivery.ethiopian_year,
                ethiopian_month=delivery.ethiopian_month,
                ethiopian_day=delivery.ethiopian_day,
                transaction_type=MilkLedgerTransaction.TransactionType.RETURN,
                quantity=delivery.returned_quantity,
                reference_id=f"DEL-RET-{delivery.id}",
                notes=f"Return during delivery to {delivery.customer.business_name}",
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

        old_del = old_instance.delivered_quantity
        old_ret = old_instance.returned_quantity
        
        new_instance = serializer.save()
        new_del = new_instance.delivered_quantity
        new_ret = new_instance.returned_quantity
        
        del_diff = new_del - old_del
        ret_diff = new_ret - old_ret
        
        if del_diff != 0:
            MilkLedgerTransaction.objects.create(
                ethiopian_date=new_instance.ethiopian_date,
                ethiopian_year=new_instance.ethiopian_year,
                ethiopian_month=new_instance.ethiopian_month,
                ethiopian_day=new_instance.ethiopian_day,
                transaction_type=MilkLedgerTransaction.TransactionType.ADJUSTMENT,
                quantity=-del_diff, # negative because increased delivery means less inventory
                reference_id=f"DEL-ADJ-{new_instance.id}",
                notes="Adjustment for delivery update",
                recorded_by=self.request.user
            )
            
        if ret_diff != 0:
            MilkLedgerTransaction.objects.create(
                ethiopian_date=new_instance.ethiopian_date,
                ethiopian_year=new_instance.ethiopian_year,
                ethiopian_month=new_instance.ethiopian_month,
                ethiopian_day=new_instance.ethiopian_day,
                transaction_type=MilkLedgerTransaction.TransactionType.ADJUSTMENT,
                quantity=ret_diff, # positive because increased return means more inventory
                reference_id=f"RET-ADJ-{new_instance.id}",
                notes="Adjustment for return update",
                recorded_by=self.request.user
            )

class MilkReturnViewSet(viewsets.ModelViewSet):
    queryset = MilkReturn.objects.all().order_by('-created_at')
    serializer_class = MilkReturnSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        milk_return = serializer.save(received_by=self.request.user)
        
        # Log to ledger (positive because returned milk comes back into inventory)
        MilkLedgerTransaction.objects.create(
            ethiopian_date=milk_return.ethiopian_date,
            ethiopian_year=milk_return.ethiopian_year,
            ethiopian_month=milk_return.ethiopian_month,
            ethiopian_day=milk_return.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.RETURN,
            quantity=milk_return.quantity,
            reference_id=f"RET-ISO-{milk_return.id}",
            notes=f"Isolated return from {milk_return.customer.business_name}. Reason: {milk_return.reason}",
            recorded_by=self.request.user
        )
