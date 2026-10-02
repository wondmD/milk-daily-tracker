import threading
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import Sum
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

from customers.models import Customer
from expenses.models import Expense
from milk_collections.models import MilkCollection
from milk_inventory.models import MilkLedgerTransaction
from processing.models import Product, ProductInventory
from settlements.models import CustomerSettlement, SupplierSettlement
from suppliers.models import Supplier


def collection_payload(supplier_id, day=1, morning='100.00'):
    return {
        'supplier': supplier_id,
        'ethiopian_date': f'Meskerem {day}, 2018',
        'ethiopian_year': 2018,
        'ethiopian_month': 1,
        'ethiopian_day': day,
        'morning_quantity': morning,
        'evening_quantity': '0.00',
        'price_per_liter': '50.00',
    }


def delivery_payload(customer_id, day=1, delivered='40.00'):
    return {
        'customer': customer_id,
        'ethiopian_date': f'Meskerem {day}, 2018',
        'ethiopian_year': 2018,
        'ethiopian_month': 1,
        'ethiopian_day': day,
        'delivered_quantity': delivered,
        'returned_quantity': '0.00',
        'price_per_liter': '60.00',
    }


class MilkCoordinationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='worker', password='pass')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.supplier = Supplier.objects.create(
            name='Abebe',
            supplier_type=Supplier.SupplierType.INDIVIDUAL_FARMER,
            default_milk_price=Decimal('50.00'),
        )
        self.customer = Customer.objects.create(
            business_name='Cafe',
            default_milk_price=Decimal('60.00'),
        )
        self.product = Product.objects.create(name='Yogurt', category='Dairy', unit='kg')
        ProductInventory.objects.create(product=self.product, quantity_available=Decimal('0'))

    def test_second_collection_for_same_supplier_and_day_is_rejected(self):
        first = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id), format='json')
        second = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id, morning='10.00'), format='json')

        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 400, second.content)

    def test_delivery_processing_and_wastage_share_one_pool(self):
        created = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id), format='json')
        self.assertEqual(created.status_code, 201, created.content)

        processed = self.client.post('/api/processing-batches/', {
            'ethiopian_date': 'Meskerem 1, 2018',
            'ethiopian_year': 2018,
            'ethiopian_month': 1,
            'ethiopian_day': 1,
            'product': self.product.id,
            'input_milk_quantity': '70.00',
            'output_quantity': '20.00',
            'processing_cost': '0.00',
        }, format='json')
        self.assertEqual(processed.status_code, 201, processed.content)

        delivered = self.client.post('/api/milk-deliveries/', delivery_payload(self.customer.id, delivered='40.00'), format='json')
        self.assertEqual(delivered.status_code, 400, delivered.content)

        wasted = self.client.post('/api/milk-wastage/', {
            'ethiopian_date': 'Meskerem 1, 2018',
            'ethiopian_year': 2018,
            'ethiopian_month': 1,
            'ethiopian_day': 1,
            'quantity': '40.00',
            'reason': 'SPOILED',
        }, format='json')
        self.assertEqual(wasted.status_code, 400, wasted.content)

        allowed = self.client.post('/api/milk-deliveries/', delivery_payload(self.customer.id, delivered='30.00'), format='json')
        self.assertEqual(allowed.status_code, 201, allowed.content)

        from django.db.models import Sum
        balance = MilkLedgerTransaction.objects.filter(
            ethiopian_year=2018, ethiopian_month=1, ethiopian_day=1,
        ).aggregate(total=Sum('quantity'))['total']
        self.assertEqual(balance, Decimal('0.00'))

    def test_payment_survives_a_later_collection(self):
        first = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id, morning='10.00'), format='json')
        self.assertEqual(first.status_code, 201, first.content)
        settlement = SupplierSettlement.objects.get(supplier=self.supplier)

        paid = self.client.post('/api/payments/', {
            'payment_type': 'SUPPLIER_PAYMENT',
            'related_settlement_id': settlement.id,
            'amount': '200.00',
            'payment_method': 'CASH',
            'ethiopian_payment_date': '1/1/2018',
        }, format='json')
        self.assertEqual(paid.status_code, 201, paid.content)

        second = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id, day=2, morning='10.00'), format='json')
        self.assertEqual(second.status_code, 201, second.content)

        settlement.refresh_from_db()
        self.assertEqual(settlement.amount_paid, Decimal('200.00'))
        self.assertEqual(settlement.total_milk_collected, Decimal('20.00'))
        self.assertEqual(settlement.remaining_balance, Decimal('800.00'))
        self.assertEqual(SupplierSettlement.objects.filter(supplier=self.supplier).count(), 1)

    def test_second_payment_cannot_exceed_the_locked_balance(self):
        created = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id, morning='4.00'), format='json')
        self.assertEqual(created.status_code, 201, created.content)
        settlement = SupplierSettlement.objects.get(supplier=self.supplier)

        payload = {
            'payment_type': 'SUPPLIER_PAYMENT',
            'related_settlement_id': settlement.id,
            'amount': '150.00',
            'payment_method': 'CASH',
            'ethiopian_payment_date': '1/1/2018',
        }
        first = self.client.post('/api/payments/', payload, format='json')
        second = self.client.post('/api/payments/', payload, format='json')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 400, second.content)

        settlement.refresh_from_db()
        self.assertEqual(settlement.amount_paid, Decimal('150.00'))
        self.assertEqual(settlement.remaining_balance, Decimal('50.00'))

    def test_walk_in_sale_is_kept_without_a_customer_record(self):
        created = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id, morning='20.00'), format='json')
        self.assertEqual(created.status_code, 201, created.content)

        first = self.client.post('/api/milk-deliveries/', {
            'customer': None,
            'buyer_name': 'Market buyer',
            'ethiopian_date': 'Meskerem 1, 2018',
            'ethiopian_year': 2018,
            'ethiopian_month': 1,
            'ethiopian_day': 1,
            'delivered_quantity': '5.00',
            'returned_quantity': '0.00',
            'price_per_liter': '80.00',
        }, format='json')
        second = self.client.post('/api/milk-deliveries/', {
            'customer': None,
            'buyer_name': '',
            'ethiopian_date': 'Meskerem 1, 2018',
            'ethiopian_year': 2018,
            'ethiopian_month': 1,
            'ethiopian_day': 1,
            'delivered_quantity': '3.00',
            'returned_quantity': '0.00',
            'price_per_liter': '70.00',
        }, format='json')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(CustomerSettlement.objects.count(), 0)

        summary = self.client.get('/api/reports/dashboard-summary/?year=2018&month=1')
        self.assertEqual(summary.status_code, 200, summary.content)
        self.assertEqual(summary.data['sales'], 610.0)
        self.assertEqual(summary.data['walk_in_sales'], 610.0)
        self.assertEqual(summary.data['milk_cost'], 1000.0)
        self.assertEqual(summary.data['profit'], -390.0)

    def test_period_shows_cost_profit_and_one_supplier_price(self):
        other = Supplier.objects.create(
            name='Chaltu',
            supplier_type=Supplier.SupplierType.INDIVIDUAL_FARMER,
            default_milk_price=Decimal('40.00'),
        )
        first = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id), format='json')
        second = self.client.post('/api/milk-collections/', collection_payload(other.id, day=2), format='json')
        later = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id, day=16, morning='10.00'), format='json')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(later.status_code, 201, later.content)

        sold = self.client.post('/api/milk-deliveries/', {
            'customer': None,
            'buyer_name': 'Walk-in',
            'ethiopian_date': 'Meskerem 1, 2018',
            'ethiopian_year': 2018,
            'ethiopian_month': 1,
            'ethiopian_day': 1,
            'delivered_quantity': '5.00',
            'returned_quantity': '0.00',
            'price_per_liter': '80.00',
        }, format='json')
        self.assertEqual(sold.status_code, 201, sold.content)
        Expense.objects.create(
            category=Expense.Category.FUEL,
            amount=Decimal('100.00'),
            ethiopian_date='Meskerem 3, 2018',
            ethiopian_year=2018,
            ethiopian_month=1,
            ethiopian_day=3,
            description='Fuel',
            recorded_by=self.user,
        )

        periods = self.client.get('/api/settlement-periods/')
        self.assertEqual(periods.status_code, 200, periods.content)
        period = next(row for row in periods.data if row['period_number'] == 1 and row['ethiopian_month'] == 1)
        updated = self.client.post(
            f"/api/settlement-periods/{period['id']}/supplier-price/",
            {'price': '70.00'},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(Decimal(updated.data['supplier_price']), Decimal('70.00'))
        self.assertEqual(updated.data['finance']['revenue'], 400.0)
        self.assertEqual(updated.data['finance']['milk_cost'], 14000.0)
        self.assertEqual(updated.data['finance']['expenses'], 100.0)
        self.assertEqual(updated.data['finance']['total_cost'], 14100.0)
        self.assertEqual(updated.data['finance']['profit'], -13700.0)

        period_one = MilkCollection.objects.filter(ethiopian_month=1, ethiopian_day__lte=15)
        self.assertTrue(all(row.price_per_liter == Decimal('70.00') for row in period_one))
        self.assertEqual(
            MilkCollection.objects.get(ethiopian_day=16).price_per_liter,
            Decimal('50.00'),
        )

        forced = self.client.post(
            '/api/milk-collections/',
            collection_payload(other.id, day=3, morning='8.00'),
            format='json',
        )
        self.assertEqual(forced.status_code, 201, forced.content)
        self.assertEqual(Decimal(forced.data['price_per_liter']), Decimal('70.00'))

    def test_customer_prices_stay_separate_inside_one_period(self):
        shop = Customer.objects.create(business_name='Shop', default_milk_price=Decimal('80.00'))
        collected = self.client.post('/api/milk-collections/', collection_payload(self.supplier.id), format='json')
        cafe_sale = self.client.post('/api/milk-deliveries/', delivery_payload(self.customer.id, delivered='40.00'), format='json')
        shop_sale = self.client.post('/api/milk-deliveries/', {
            **delivery_payload(shop.id, delivered='20.00'),
            'price_per_liter': '80.00',
        }, format='json')
        self.assertEqual(collected.status_code, 201, collected.content)
        self.assertEqual(cafe_sale.status_code, 201, cafe_sale.content)
        self.assertEqual(shop_sale.status_code, 201, shop_sale.content)

        settlements = self.client.get('/api/customer-settlements/')
        cafe = next(row for row in settlements.data if row['customer'] == self.customer.id)
        updated = self.client.post(
            f"/api/customer-settlements/{cafe['id']}/price/",
            {'price': '90.00'},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(Decimal(updated.data['gross_amount']), Decimal('3600.00'))
        self.assertEqual(updated.data['unit_price'], 90.0)

        shop.refresh_from_db()
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.default_milk_price, Decimal('90.00'))
        self.assertEqual(shop.default_milk_price, Decimal('80.00'))
        shop_row = next(row for row in self.client.get('/api/customer-settlements/').data if row['customer'] == shop.id)
        self.assertEqual(Decimal(shop_row['gross_amount']), Decimal('1600.00'))
        self.assertEqual(shop_row['unit_price'], 80.0)


class ConcurrentDeliveryTests(TransactionTestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='worker', password='pass')
        self.supplier = Supplier.objects.create(
            name='Abebe',
            supplier_type=Supplier.SupplierType.INDIVIDUAL_FARMER,
            default_milk_price=Decimal('50.00'),
        )
        self.customer_a = Customer.objects.create(business_name='Cafe A', default_milk_price=Decimal('60.00'))
        self.customer_b = Customer.objects.create(business_name='Cafe B', default_milk_price=Decimal('60.00'))
        client = APIClient()
        client.force_authenticate(self.user)
        created = client.post('/api/milk-collections/', collection_payload(self.supplier.id), format='json')
        self.assertEqual(created.status_code, 201, created.content)

    def test_two_deliveries_cannot_spend_the_same_liters(self):
        if not connection.features.has_select_for_update:
            self.skipTest('Concurrent allocation is enforced with row locks on PostgreSQL.')

        barrier = threading.Barrier(2)
        results = []
        errors = []

        def deliver(customer_id):
            connection.close()
            try:
                client = APIClient()
                user = get_user_model().objects.get(pk=self.user.pk)
                client.force_authenticate(user)
                barrier.wait(timeout=10)
                response = client.post(
                    '/api/milk-deliveries/',
                    delivery_payload(customer_id, delivered='80.00'),
                    format='json',
                )
                results.append(response.status_code)
            except Exception as exc:
                errors.append(exc)
            finally:
                connection.close()

        threads = [
            threading.Thread(target=deliver, args=(self.customer_a.id,)),
            threading.Thread(target=deliver, args=(self.customer_b.id,)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        self.assertEqual(errors, [])
        self.assertCountEqual(results, [201, 400])
        balance = MilkLedgerTransaction.objects.filter(
            ethiopian_year=2018, ethiopian_month=1, ethiopian_day=1,
        ).aggregate(total=Sum('quantity'))['total']
        self.assertGreaterEqual(balance, Decimal('0'))
