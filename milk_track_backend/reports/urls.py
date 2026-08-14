from django.urls import path
from .views import DashboardSummaryView, TrendSummaryView, TopSuppliersView

urlpatterns = [
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('trend-summary/', TrendSummaryView.as_view(), name='trend-summary'),
    path('top-suppliers/', TopSuppliersView.as_view(), name='top-suppliers'),
]
