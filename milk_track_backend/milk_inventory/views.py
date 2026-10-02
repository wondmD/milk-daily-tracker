from decimal import Decimal

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.db import transaction
from .coordination import lock_days, require_milk, sync_ledger
from .models import MilkLedgerTransaction, MilkWastage
from .serializers import MilkLedgerTransactionSerializer, MilkWastageSerializer

class MilkLedgerTransactionViewSet(viewsets.ModelViewSet):
    queryset = MilkLedgerTransaction.objects.all().order_by('-created_at')
    serializer_class = MilkLedgerTransactionSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        day = (data['ethiopian_year'], data['ethiopian_month'], data['ethiopian_day'])
        lock_days(day)
        quantity = Decimal(data['quantity'])
        if quantity < 0:
            require_milk(*day, -quantity)
        serializer.save(recorded_by=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        old = self.get_object()
        old_date = (old.ethiopian_year, old.ethiopian_month, old.ethiopian_day)
        new_date = (
            serializer.validated_data.get('ethiopian_year', old.ethiopian_year),
            serializer.validated_data.get('ethiopian_month', old.ethiopian_month),
            serializer.validated_data.get('ethiopian_day', old.ethiopian_day),
        )
        new_quantity = Decimal(serializer.validated_data.get('quantity', old.quantity))
        lock_days(old_date, new_date)
        if old_date == new_date:
            delta = new_quantity - old.quantity
            if delta < 0:
                require_milk(*old_date, -delta)
        else:
            if old.quantity > 0:
                require_milk(*old_date, old.quantity)
            if new_quantity < 0:
                require_milk(*new_date, -new_quantity)
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        lock_days((instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day))
        if instance.quantity > 0:
            require_milk(instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day, instance.quantity)
        instance.delete()

class DailyReconciliationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, year, month, day):
        transactions = MilkLedgerTransaction.objects.filter(
            ethiopian_year=year,
            ethiopian_month=month,
            ethiopian_day=day
        )
        
        # Aggregate totals
        collected = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.COLLECTION).aggregate(Sum('quantity'))['quantity__sum'] or 0
        returned = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.RETURN).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        delivered = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.DELIVERY).aggregate(Sum('quantity'))['quantity__sum'] or 0
        processed = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.PROCESSING).aggregate(Sum('quantity'))['quantity__sum'] or 0
        stored = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.STORAGE).aggregate(Sum('quantity'))['quantity__sum'] or 0
        wasted = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.WASTE).aggregate(Sum('quantity'))['quantity__sum'] or 0
        sale_other = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.SALE_OTHER).aggregate(Sum('quantity'))['quantity__sum'] or 0
        adjusted = transactions.filter(transaction_type=MilkLedgerTransaction.TransactionType.ADJUSTMENT).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        # Calculate totals. Remember: outgoing types are stored as negative values, but for reporting we might want absolute values.
        # Wait, the prompt says "Positive for in, Negative for out".
        
        total_available = collected + returned
        
        # Outgoing types will sum to negative numbers, so we use abs() or reverse the sign for reporting
        total_accounted_out = abs(delivered + processed + stored + wasted + sale_other)
        
        net_balance = transactions.aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        return Response({
            'date': f"{year}-{month}-{day}",
            'collected': collected,
            'returned': returned,
            'total_available': total_available,
            'delivered': abs(delivered),
            'processed': abs(processed),
            'stored': abs(stored),
            'wasted': abs(wasted),
            'sale_other': abs(sale_other),
            'adjusted': adjusted,
            'total_accounted_out': total_accounted_out,
            'net_balance': net_balance, # 0 means fully reconciled
            'is_reconciled': net_balance == 0
        })

class MilkWastageViewSet(viewsets.ModelViewSet):
    queryset = MilkWastage.objects.all().order_by('-created_at')
    serializer_class = MilkWastageSerializer
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        day = (data['ethiopian_year'], data['ethiopian_month'], data['ethiopian_day'])
        lock_days(day)
        require_milk(*day, data['quantity'])
        wastage = serializer.save(recorded_by=self.request.user)
        _sync_wastage_ledger(wastage, self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        old = self.get_object()
        old_date = (old.ethiopian_year, old.ethiopian_month, old.ethiopian_day)
        new_date = (
            serializer.validated_data.get('ethiopian_year', old.ethiopian_year),
            serializer.validated_data.get('ethiopian_month', old.ethiopian_month),
            serializer.validated_data.get('ethiopian_day', old.ethiopian_day),
        )
        new_quantity = Decimal(serializer.validated_data.get('quantity', old.quantity))
        lock_days(old_date, new_date)
        if old_date == new_date:
            if new_quantity > old.quantity:
                require_milk(*old_date, new_quantity - old.quantity)
        else:
            require_milk(*new_date, new_quantity)
        wastage = serializer.save()
        _sync_wastage_ledger(wastage, self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        lock_days((instance.ethiopian_year, instance.ethiopian_month, instance.ethiopian_day))
        sync_ledger([f'WST-{instance.id}', f'WST-DEL-{instance.id}'], [])
        instance.delete()


def _sync_wastage_ledger(wastage, user):
    sync_ledger([f'WST-{wastage.id}', f'WST-DEL-{wastage.id}'], [{
        'ethiopian_date': wastage.ethiopian_date,
        'ethiopian_year': wastage.ethiopian_year,
        'ethiopian_month': wastage.ethiopian_month,
        'ethiopian_day': wastage.ethiopian_day,
        'transaction_type': MilkLedgerTransaction.TransactionType.WASTE,
        'quantity': -wastage.quantity,
        'reference_id': f'WST-{wastage.id}',
        'notes': f'Wastage: {wastage.get_reason_display()}',
        'recorded_by': user,
    }])
