from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum, F
from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery
from .models import SettlementPeriod, SupplierSettlement, CustomerSettlement
from payments.models import SupplierAdvance
from django.db.models import Q

def get_period_number(day):
    return 1 if day <= 15 else 2

@receiver([post_save, post_delete], sender=MilkCollection)
def update_supplier_settlement(sender, instance, **kwargs):
    period_num = get_period_number(instance.ethiopian_day)
    
    # ensure_current_period can be used, but since we have the exact year/month we can just find or create it.
    # We need start and end dates. 
    # Let's borrow the logic from ensure_current_period for date formatting
    months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
              'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume']
    month_name = months[instance.ethiopian_month - 1]
    
    if instance.ethiopian_month == 13:
        start_date = f"{month_name} 1, {instance.ethiopian_year}"
        end_date = f"{month_name} 6, {instance.ethiopian_year}"
    else:
        if period_num == 1:
            start_date = f"{month_name} 1, {instance.ethiopian_year}"
            end_date = f"{month_name} 15, {instance.ethiopian_year}"
        else:
            start_date = f"{month_name} 16, {instance.ethiopian_year}"
            end_date = f"{month_name} 30, {instance.ethiopian_year}"

    period, _ = SettlementPeriod.objects.get_or_create(
        ethiopian_year=instance.ethiopian_year,
        ethiopian_month=instance.ethiopian_month,
        period_number=period_num,
        defaults={
            'start_date_ethiopian': start_date,
            'end_date_ethiopian': end_date
        }
    )
    
    collections = MilkCollection.objects.filter(
        supplier=instance.supplier,
        ethiopian_year=instance.ethiopian_year,
        ethiopian_month=instance.ethiopian_month,
    )
    if period_num == 1:
        collections = collections.filter(ethiopian_day__lte=15)
    else:
        collections = collections.filter(ethiopian_day__gt=15)

    totals = collections.aggregate(
        total_qty=Sum('total_quantity'),
        total_amt=Sum(F('total_quantity') * F('price_per_liter'))
    )

    total_qty = totals['total_qty'] or 0
    total_amt = totals['total_amt'] or 0

    if total_qty > 0:
        advances = SupplierAdvance.objects.filter(
            supplier=instance.supplier
        ).filter(
            Q(status=SupplierAdvance.Status.PENDING) | Q(settlement_period=period)
        )
        total_advances = advances.aggregate(Sum('amount'))['amount__sum'] or 0
        final_amt = total_amt - total_advances
        
        settlement, created = SupplierSettlement.objects.get_or_create(
            supplier=instance.supplier,
            settlement_period=period,
            defaults={
                'total_milk_collected': total_qty,
                'gross_amount': total_amt,
                'adjustments': -total_advances,
                'final_amount': final_amt,
                'remaining_balance': final_amt
            }
        )
        if not created:
            settlement.total_milk_collected = total_qty
            settlement.gross_amount = total_amt
            settlement.adjustments = -total_advances
            settlement.final_amount = final_amt
            
            # Recalculate balance
            settlement.remaining_balance = final_amt - settlement.amount_paid
            
            # Auto-update status based on balance
            if settlement.remaining_balance <= 0 and settlement.amount_paid > 0:
                settlement.payment_status = SupplierSettlement.PaymentStatus.PAID
            elif settlement.amount_paid > 0:
                settlement.payment_status = SupplierSettlement.PaymentStatus.PARTIALLY_PAID
            else:
                settlement.payment_status = SupplierSettlement.PaymentStatus.UNPAID
                
            settlement.save()
            
        advances.update(status=SupplierAdvance.Status.DEDUCTED, settlement_period=period)
    else:
        # If deleted and no more collections exist, delete the settlement record entirely
        SupplierSettlement.objects.filter(supplier=instance.supplier, settlement_period=period).delete()


@receiver([post_save, post_delete], sender=MilkDelivery)
def update_customer_settlement(sender, instance, **kwargs):
    period_num = get_period_number(instance.ethiopian_day)
    
    months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
              'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume']
    month_name = months[instance.ethiopian_month - 1]
    
    if instance.ethiopian_month == 13:
        start_date = f"{month_name} 1, {instance.ethiopian_year}"
        end_date = f"{month_name} 6, {instance.ethiopian_year}"
    else:
        if period_num == 1:
            start_date = f"{month_name} 1, {instance.ethiopian_year}"
            end_date = f"{month_name} 15, {instance.ethiopian_year}"
        else:
            start_date = f"{month_name} 16, {instance.ethiopian_year}"
            end_date = f"{month_name} 30, {instance.ethiopian_year}"

    period, _ = SettlementPeriod.objects.get_or_create(
        ethiopian_year=instance.ethiopian_year,
        ethiopian_month=instance.ethiopian_month,
        period_number=period_num,
        defaults={
            'start_date_ethiopian': start_date,
            'end_date_ethiopian': end_date
        }
    )
    
    deliveries = MilkDelivery.objects.filter(
        customer=instance.customer,
        ethiopian_year=instance.ethiopian_year,
        ethiopian_month=instance.ethiopian_month,
    )
    if period_num == 1:
        deliveries = deliveries.filter(ethiopian_day__lte=15)
    else:
        deliveries = deliveries.filter(ethiopian_day__gt=15)

    totals = deliveries.aggregate(
        tot_del=Sum('delivered_quantity'),
        tot_ret=Sum('returned_quantity'),
        tot_net=Sum('net_quantity'),
        tot_amt=Sum(F('net_quantity') * F('price_per_liter'))
    )

    tot_del = totals['tot_del'] or 0
    tot_ret = totals['tot_ret'] or 0
    tot_net = totals['tot_net'] or 0
    tot_amt = totals['tot_amt'] or 0

    if tot_net > 0 or tot_del > 0:
        settlement, created = CustomerSettlement.objects.get_or_create(
            customer=instance.customer,
            settlement_period=period,
            defaults={
                'total_delivered': tot_del,
                'total_returned': tot_ret,
                'net_quantity': tot_net,
                'gross_amount': tot_amt,
                'final_amount': tot_amt,
                'remaining_balance': tot_amt
            }
        )
        if not created:
            settlement.total_delivered = tot_del
            settlement.total_returned = tot_ret
            settlement.net_quantity = tot_net
            settlement.gross_amount = tot_amt
            settlement.final_amount = tot_amt
            
            settlement.remaining_balance = tot_amt - settlement.amount_paid
            
            if settlement.remaining_balance <= 0 and settlement.amount_paid > 0:
                settlement.payment_status = CustomerSettlement.PaymentStatus.PAID
            elif settlement.amount_paid > 0:
                settlement.payment_status = CustomerSettlement.PaymentStatus.PARTIALLY_PAID
            else:
                settlement.payment_status = CustomerSettlement.PaymentStatus.UNPAID
                
            settlement.save()
    else:
        CustomerSettlement.objects.filter(customer=instance.customer, settlement_period=period).delete()

@receiver([post_save, post_delete], sender=SupplierAdvance)
def recalculate_settlement_on_advance(sender, instance, **kwargs):
    collections = MilkCollection.objects.filter(supplier=instance.supplier).order_by('-ethiopian_year', '-ethiopian_month', '-ethiopian_day')
    if collections.exists():
        col = collections.first()
        col.save(update_fields=['ethiopian_day']) # Trigger signal without changing data
