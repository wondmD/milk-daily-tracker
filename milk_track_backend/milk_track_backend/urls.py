from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from suppliers.views import SupplierViewSet
from customers.views import CustomerViewSet
from milk_collections.views import MilkCollectionViewSet
from distributions.views import MilkDeliveryViewSet, MilkReturnViewSet
from milk_inventory.views import MilkLedgerTransactionViewSet, DailyReconciliationView
from processing.views import ProductViewSet, ProductInventoryViewSet, ProcessingBatchViewSet
from settlements.views import SettlementPeriodViewSet, SupplierSettlementViewSet, CustomerSettlementViewSet
from payments.views import PaymentViewSet, SupplierAdvanceViewSet
from expenses.views import ExpenseViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'milk-collections', MilkCollectionViewSet)
router.register(r'milk-deliveries', MilkDeliveryViewSet)
router.register(r'milk-returns', MilkReturnViewSet)
router.register(r'milk-ledger', MilkLedgerTransactionViewSet)
router.register(r'products', ProductViewSet)
router.register(r'product-inventory', ProductInventoryViewSet)
router.register(r'processing-batches', ProcessingBatchViewSet)
router.register(r'settlement-periods', SettlementPeriodViewSet)
router.register(r'supplier-settlements', SupplierSettlementViewSet)
router.register(r'customer-settlements', CustomerSettlementViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'supplier-advances', SupplierAdvanceViewSet)
router.register(r'expenses', ExpenseViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Custom API endpoints
    path('api/daily-reconciliation/<int:year>/<int:month>/<int:day>/', DailyReconciliationView.as_view(), name='daily-reconciliation'),
    
    # Router API endpoints
    path('api/reports/', include('reports.urls')),
    path('api/', include(router.urls)),
]
