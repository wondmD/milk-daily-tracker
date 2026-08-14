import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'milk_track_backend.settings')
django.setup()
from milk_inventory.models import MilkLedgerTransaction
from django.db.models import Sum

tx = MilkLedgerTransaction.objects.filter(ethiopian_year=2018, ethiopian_month=12, ethiopian_day=7)
col = tx.filter(transaction_type=MilkLedgerTransaction.TransactionType.COLLECTION).aggregate(Sum('quantity'))['quantity__sum'] or 0
deliv = tx.filter(transaction_type=MilkLedgerTransaction.TransactionType.DELIVERY).aggregate(Sum('quantity'))['quantity__sum'] or 0
proc = tx.filter(transaction_type=MilkLedgerTransaction.TransactionType.PROCESSING).aggregate(Sum('quantity'))['quantity__sum'] or 0
ret = tx.filter(transaction_type=MilkLedgerTransaction.TransactionType.RETURN).aggregate(Sum('quantity'))['quantity__sum'] or 0

print(f"Col: {col}, Deliv: {deliv}, Proc: {proc}, Ret: {ret}, Net: {col+deliv+proc+ret}")
