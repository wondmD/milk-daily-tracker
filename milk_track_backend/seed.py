import os
import django
import random
from decimal import Decimal
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'milk_track_backend.settings')
django.setup()

from django.db.models import Sum, F
from django.contrib.auth import get_user_model
from suppliers.models import Supplier
from customers.models import Customer
from milk_collections.models import MilkCollection
from distributions.models import MilkDelivery
from settlements.models import SettlementPeriod, SupplierSettlement, CustomerSettlement
from milk_inventory.models import MilkLedgerTransaction
from processing.models import Product, ProductInventory, ProcessingBatch
from expenses.models import Expense

def clear_db():
    print("Clearing database...")
    Expense.objects.all().delete()
    MilkLedgerTransaction.objects.all().delete()
    ProcessingBatch.objects.all().delete()
    ProductInventory.objects.all().delete()
    Product.objects.all().delete()
    SupplierSettlement.objects.all().delete()
    CustomerSettlement.objects.all().delete()
    SettlementPeriod.objects.all().delete()
    MilkCollection.objects.all()._raw_delete(MilkCollection.objects.db)
    MilkDelivery.objects.all()._raw_delete(MilkDelivery.objects.db)
    Supplier.objects.all().delete()
    Customer.objects.all().delete()
    print("Database cleared.")

def create_entities():
    print("Creating products...")
    products = [
        Product.objects.create(name="Cheese", category="DAIRY", unit="kg"),
        Product.objects.create(name="Butter", category="DAIRY", unit="kg"),
        Product.objects.create(name="Yogurt", category="DAIRY", unit="liter"),
        Product.objects.create(name="Pasteurized Milk", category="MILK", unit="liter"),
    ]
    
    print("Creating suppliers and customers...")
    suppliers = []
    for i in range(1, 31):
        suppliers.append(Supplier.objects.create(
            name=f"Supplier {i}",
            supplier_type="FARMER" if random.random() > 0.3 else "COOPERATIVE",
            phone_number=f"09{random.randint(10000000, 99999999)}",
            status="ACTIVE",
            default_milk_price=random.choice([50, 52, 55])
        ))
        
    customers = []
    locations = ["Addis Ababa", "Bishoftu", "Adama", "Hawassa"]
    for i in range(1, 26):
        customers.append(Customer.objects.create(
            business_name=f"Customer Business {i}",
            phone_number=f"09{random.randint(10000000, 99999999)}",
            location=random.choice(locations),
            status="ACTIVE",
            default_milk_price=random.choice([75, 80, 85])
        ))
        
    return suppliers, customers, products

def get_month_name(month_idx):
    months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
              'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume']
    return months[month_idx - 1]

def calculate_settlements(period):
    # Supplier
    collections = MilkCollection.objects.filter(ethiopian_year=period.ethiopian_year, ethiopian_month=period.ethiopian_month)
    if period.period_number == 1:
        collections = collections.filter(ethiopian_day__lte=15)
    else:
        collections = collections.filter(ethiopian_day__gt=15)

    supplier_totals = collections.values('supplier').annotate(
        total_qty=Sum('total_quantity'),
        total_amt=Sum(F('total_quantity') * F('price_per_liter'))
    )

    for st in supplier_totals:
        SupplierSettlement.objects.update_or_create(
            supplier_id=st['supplier'],
            settlement_period=period,
            defaults={
                'total_milk_collected': st['total_qty'],
                'gross_amount': st['total_amt'],
                'final_amount': st['total_amt'],
                'amount_paid': st['total_amt'],
                'payment_status': SupplierSettlement.PaymentStatus.PAID,
                'remaining_balance': 0
            }
        )

    # Customer
    deliveries = MilkDelivery.objects.filter(ethiopian_year=period.ethiopian_year, ethiopian_month=period.ethiopian_month)
    if period.period_number == 1:
        deliveries = deliveries.filter(ethiopian_day__lte=15)
    else:
        deliveries = deliveries.filter(ethiopian_day__gt=15)

    customer_totals = deliveries.values('customer').annotate(
        tot_del=Sum('delivered_quantity'),
        tot_ret=Sum('returned_quantity'),
        tot_net=Sum('net_quantity'),
        tot_amt=Sum(F('net_quantity') * F('price_per_liter'))
    )

    for ct in customer_totals:
        CustomerSettlement.objects.update_or_create(
            customer_id=ct['customer'],
            settlement_period=period,
            defaults={
                'total_delivered': ct['tot_del'],
                'total_returned': ct['tot_ret'],
                'net_quantity': ct['tot_net'],
                'gross_amount': ct['tot_amt'],
                'final_amount': ct['tot_amt'],
                'amount_paid': ct['tot_amt'],
                'payment_status': CustomerSettlement.PaymentStatus.PAID,
                'remaining_balance': 0
            }
        )

    period.status = SettlementPeriod.Status.SETTLED
    period.save()

def seed_period(year, month, period_number, suppliers, customers, products, admin, is_current=False, current_day=1):
    month_name = get_month_name(month)
    
    if period_number == 1:
        start_day, end_day = 1, 15
        start_date = f"{month_name} 1, {year}"
        end_date = f"{month_name} 15, {year}"
    else:
        start_day, end_day = 16, 30
        start_date = f"{month_name} 16, {year}"
        end_date = f"{month_name} 30, {year}"

    period = SettlementPeriod.objects.create(
        ethiopian_year=year,
        ethiopian_month=month,
        period_number=period_number,
        start_date_ethiopian=start_date,
        end_date_ethiopian=end_date,
        status=SettlementPeriod.Status.OPEN
    )

    print(f"Seeding {period} ...")
    
    last_day = end_day
    if is_current and current_day <= end_day:
        last_day = current_day
    
    collections_to_create = []
    deliveries_to_create = []
    transactions_to_create = []
    expenses_to_create = []
    batches_to_create = []

    for day in range(start_day, last_day + 1):
        eth_date_str = f"{year}-{month:02d}-{day:02d}"
        daily_collected = 0
        
        # Suppliers (Collections)
        for supplier in suppliers:
            if random.random() > 0.15: # 85% participation
                morning = random.randint(10, 30)
                evening = random.randint(10, 25)
                total = morning + evening
                daily_collected += total
                
                # We need to simulate ID later or just save directly if we need IDs for transactions.
                # To be exact and fast, we'll save Collections directly to get IDs for Ledger.
                col = MilkCollection.objects.create(
                    supplier=supplier,
                    ethiopian_date=eth_date_str,
                    ethiopian_year=year,
                    ethiopian_month=month,
                    ethiopian_day=day,
                    morning_quantity=morning,
                    evening_quantity=evening,
                    price_per_liter=supplier.default_milk_price
                )
                
                transactions_to_create.append(MilkLedgerTransaction(
                    ethiopian_date=eth_date_str,
                    ethiopian_year=year,
                    ethiopian_month=month,
                    ethiopian_day=day,
                    transaction_type=MilkLedgerTransaction.TransactionType.COLLECTION,
                    quantity=total,
                    reference_id=f"COL-{col.id}",
                    notes=f"Collection from {supplier.name}",
                    recorded_by=admin
                ))

        # Customers (Deliveries)
        milk_to_distribute = int(daily_collected * random.uniform(0.7, 0.85)) # Send 70-85% to customers
        avg_per_customer = milk_to_distribute // len(customers)
        
        for customer in customers:
            if random.random() > 0.15:
                delivered = avg_per_customer + random.randint(-5, 10)
                if delivered < 0: delivered = 0
                returned = random.randint(0, 5) if random.random() > 0.8 else 0
                
                deliv = MilkDelivery.objects.create(
                    customer=customer,
                    ethiopian_date=eth_date_str,
                    ethiopian_year=year,
                    ethiopian_month=month,
                    ethiopian_day=day,
                    delivered_quantity=delivered,
                    returned_quantity=returned,
                    price_per_liter=customer.default_milk_price
                )
                
                transactions_to_create.append(MilkLedgerTransaction(
                    ethiopian_date=eth_date_str,
                    ethiopian_year=year,
                    ethiopian_month=month,
                    ethiopian_day=day,
                    transaction_type=MilkLedgerTransaction.TransactionType.DELIVERY,
                    quantity=-delivered,
                    reference_id=f"DEL-{deliv.id}",
                    notes=f"Delivery to {customer.business_name}",
                    recorded_by=admin
                ))
                
                if returned > 0:
                    transactions_to_create.append(MilkLedgerTransaction(
                        ethiopian_date=eth_date_str,
                        ethiopian_year=year,
                        ethiopian_month=month,
                        ethiopian_day=day,
                        transaction_type=MilkLedgerTransaction.TransactionType.RETURN,
                        quantity=returned,
                        reference_id=f"DEL-RET-{deliv.id}",
                        notes=f"Return from {customer.business_name}",
                        recorded_by=admin
                    ))

        # Processing (Use remaining milk)
        if random.random() > 0.5: # 50% chance of processing day
            product = random.choice(products)
            input_milk = random.randint(20, 100)
            output_qty = input_milk * random.uniform(0.1, 0.9) # arbitrary conversion
            
            batch = ProcessingBatch.objects.create(
                product=product,
                ethiopian_date=eth_date_str,
                ethiopian_year=year,
                ethiopian_month=month,
                ethiopian_day=day,
                input_milk_quantity=input_milk,
                output_quantity=output_qty,
                processing_cost=random.randint(50, 200),
                recorded_by=admin
            )
            
            # Update Inventory
            inv, _ = ProductInventory.objects.get_or_create(product=product)
            inv.quantity_available = float(inv.quantity_available) + output_qty
            inv.save()
            
            transactions_to_create.append(MilkLedgerTransaction(
                ethiopian_date=eth_date_str,
                ethiopian_year=year,
                ethiopian_month=month,
                ethiopian_day=day,
                transaction_type=MilkLedgerTransaction.TransactionType.PROCESSING,
                quantity=-input_milk,
                reference_id=f"PROC-{batch.id}",
                notes=f"Processed into {product.name}",
                recorded_by=admin
            ))
            
        # Expenses
        if random.random() > 0.3:
            expenses_to_create.append(Expense(
                category=random.choice(Expense.Category.choices)[0],
                amount=random.randint(100, 1000),
                ethiopian_date=eth_date_str,
                ethiopian_year=year,
                ethiopian_month=month,
                ethiopian_day=day,
                description=f"Daily operational expense",
                settlement_period=period,
                recorded_by=admin
            ))

    # Bulk create transactions and expenses
    MilkLedgerTransaction.objects.bulk_create(transactions_to_create)
    Expense.objects.bulk_create(expenses_to_create)

    if not is_current:
        calculate_settlements(period)

def run():
    User = get_user_model()
    admin = User.objects.first()
    if not admin:
        print("No admin user found. Creating one...")
        admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin')

    clear_db()
    suppliers, customers, products = create_entities()
    
    # We'll do Month 10 (Sene), Month 11 (Hamle), and Month 12 (Nehase)
    seed_period(2018, 10, 1, suppliers, customers, products, admin)
    seed_period(2018, 10, 2, suppliers, customers, products, admin)
    
    seed_period(2018, 11, 1, suppliers, customers, products, admin)
    seed_period(2018, 11, 2, suppliers, customers, products, admin)
    
    seed_period(2018, 12, 1, suppliers, customers, products, admin)
    seed_period(2018, 12, 2, suppliers, customers, products, admin, is_current=True, current_day=13)
    
    print("Seed complete!")

if __name__ == '__main__':
    run()
