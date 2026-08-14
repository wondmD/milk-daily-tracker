from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.db import transaction
from .models import MilkLedgerTransaction, MilkWastage
from .serializers import MilkLedgerTransactionSerializer, MilkWastageSerializer

class MilkLedgerTransactionViewSet(viewsets.ModelViewSet):
    queryset = MilkLedgerTransaction.objects.all().order_by('-created_at')
    serializer_class = MilkLedgerTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

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
        wastage = serializer.save(recorded_by=self.request.user)
        
        # Log to ledger (negative because milk is lost)
        MilkLedgerTransaction.objects.create(
            ethiopian_date=wastage.ethiopian_date,
            ethiopian_year=wastage.ethiopian_year,
            ethiopian_month=wastage.ethiopian_month,
            ethiopian_day=wastage.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.WASTE,
            quantity=-wastage.quantity,
            reference_id=f"WST-{wastage.id}",
            notes=f"Wastage: {wastage.get_reason_display()}",
            recorded_by=self.request.user
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        # Revert ledger
        MilkLedgerTransaction.objects.create(
            ethiopian_date=instance.ethiopian_date,
            ethiopian_year=instance.ethiopian_year,
            ethiopian_month=instance.ethiopian_month,
            ethiopian_day=instance.ethiopian_day,
            transaction_type=MilkLedgerTransaction.TransactionType.ADJUSTMENT,
            quantity=instance.quantity, # positive because we are removing a waste entry
            reference_id=f"WST-DEL-{instance.id}",
            notes=f"Reversal due to wastage deletion",
            recorded_by=self.request.user
        )
        instance.delete()
