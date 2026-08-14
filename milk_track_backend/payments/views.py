from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Payment, SupplierAdvance
from .serializers import PaymentSerializer, SupplierAdvanceSerializer
from settlements.models import SupplierSettlement, CustomerSettlement, SettlementPeriod

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user)
        
        # Update associated settlement if applicable
        if payment.related_settlement_id:
            if payment.payment_type == Payment.PaymentType.CUSTOMER_PAYMENT:
                settlement = CustomerSettlement.objects.get(id=payment.related_settlement_id)
                settlement.amount_paid += payment.amount
                settlement.remaining_balance = settlement.final_amount - settlement.amount_paid
                
                if settlement.remaining_balance <= 0:
                    settlement.payment_status = CustomerSettlement.PaymentStatus.PAID
                else:
                    settlement.payment_status = CustomerSettlement.PaymentStatus.PARTIALLY_PAID
                settlement.save()
                
            elif payment.payment_type == Payment.PaymentType.SUPPLIER_PAYMENT:
                settlement = SupplierSettlement.objects.get(id=payment.related_settlement_id)
                settlement.amount_paid += payment.amount
                settlement.remaining_balance = settlement.final_amount - settlement.amount_paid
                
                if settlement.remaining_balance <= 0:
                    settlement.payment_status = SupplierSettlement.PaymentStatus.PAID
                else:
                    settlement.payment_status = SupplierSettlement.PaymentStatus.PARTIALLY_PAID
                settlement.save()

class SupplierAdvanceViewSet(viewsets.ModelViewSet):
    queryset = SupplierAdvance.objects.all().order_by('-created_at')
    serializer_class = SupplierAdvanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['supplier', 'status', 'settlement_period']

    def perform_create(self, serializer):
        advance = serializer.save(recorded_by=self.request.user)
        
        # Link to a settlement period automatically based on date
        period = SettlementPeriod.get_period_for_ethiopian_date(advance.ethiopian_date)
        if period:
            advance.settlement_period = period
            advance.save()
