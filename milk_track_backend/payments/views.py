from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Payment, SupplierAdvance
from .serializers import PaymentSerializer, SupplierAdvanceSerializer
from settlements.coordination import apply_settlement_payment

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user)
        _apply_linked_payment(payment, payment.amount)

    @transaction.atomic
    def perform_destroy(self, instance):
        _apply_linked_payment(instance, -instance.amount)
        instance.delete()

class SupplierAdvanceViewSet(viewsets.ModelViewSet):
    queryset = SupplierAdvance.objects.all().order_by('-created_at')
    serializer_class = SupplierAdvanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['supplier', 'status', 'settlement_period']

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


def _apply_linked_payment(payment, amount):
    if not payment.related_settlement_id:
        return
    if payment.payment_type == Payment.PaymentType.CUSTOMER_PAYMENT:
        apply_settlement_payment('customer', payment.related_settlement_id, amount)
    elif payment.payment_type == Payment.PaymentType.SUPPLIER_PAYMENT:
        apply_settlement_payment('supplier', payment.related_settlement_id, amount)
