from django.urls import path
from .views import DashboardSummaryView, OperationsDashboardView, TopSuppliersView, TrendSummaryView

urlpatterns = [
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('operations-dashboard/', OperationsDashboardView.as_view(), name='operations-dashboard'),
    path('trend-summary/', TrendSummaryView.as_view(), name='trend-summary'),
    path('top-suppliers/', TopSuppliersView.as_view(), name='top-suppliers'),
]
