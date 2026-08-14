from django.urls import path
from .views import DashboardSummaryView, TrendSummaryView

urlpatterns = [
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('trend-summary/', TrendSummaryView.as_view(), name='trend-summary'),
]
