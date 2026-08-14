from django.db import models
from suppliers.models import Supplier
from customers.models import Customer
from django.conf import settings

class SettlementPeriod(models.Model):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        CALCULATED = 'CALCULATED', 'Calculated'
        PARTIALLY_SETTLED = 'PARTIALLY_SETTLED', 'Partially Settled'
        SETTLED = 'SETTLED', 'Settled'
        CLOSED = 'CLOSED', 'Closed'
        
    ethiopian_year = models.IntegerField()
    ethiopian_month = models.IntegerField()
    period_number = models.IntegerField(help_text="1 for days 1-15, 2 for 16-end")
    
    start_date_ethiopian = models.CharField(max_length=20)
    end_date_ethiopian = models.CharField(max_length=20)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Period {self.period_number} - Month {self.ethiopian_month}, Year {self.ethiopian_year}"

    @classmethod
    def ensure_current_period(cls):
        from ethiopian_date import EthiopianDateConverter
        import datetime
        
        today = datetime.date.today()
        d = EthiopianDateConverter.date_to_ethiopian(today)
        year, month, day = d.year, d.month, d.day
        
        period_number = 1 if day <= 15 else 2
        
        months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
                  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume']
        month_name = months[month - 1]
        
        if month == 13:
            period_number = 1
            start_date = f"{month_name} 1, {year}"
            end_date = f"{month_name} 6, {year}"
        else:
            if period_number == 1:
                start_date = f"{month_name} 1, {year}"
                end_date = f"{month_name} 15, {year}"
            else:
                start_date = f"{month_name} 16, {year}"
                end_date = f"{month_name} 30, {year}"
                
        period, created = cls.objects.get_or_create(
            ethiopian_year=year,
            ethiopian_month=month,
            period_number=period_number,
            defaults={
                'start_date_ethiopian': start_date,
                'end_date_ethiopian': end_date
            }
        )
        return period

class SupplierSettlement(models.Model):
    class PaymentStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='settlements')
    settlement_period = models.ForeignKey(SettlementPeriod, on_delete=models.CASCADE, related_name='supplier_settlements')
    
    total_milk_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    notes = models.TextField(blank=True, null=True)

class CustomerSettlement(models.Model):
    class PaymentStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='settlements')
    settlement_period = models.ForeignKey(SettlementPeriod, on_delete=models.CASCADE, related_name='customer_settlements')
    
    total_delivered = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_returned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    notes = models.TextField(blank=True, null=True)
