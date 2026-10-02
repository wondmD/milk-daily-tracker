import datetime

from ethiopian_date import EthiopianDateConverter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .finance import build_month_summary, build_operations_dashboard, build_top_suppliers, build_trend


class TrendSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 14))
        except (TypeError, ValueError):
            days = 14
        return Response(build_trend(max(1, min(days, 60))))


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        if not year or not month:
            today = datetime.date.today()
            eth = EthiopianDateConverter.date_to_ethiopian(today)
            year, month = eth.year, eth.month
        return Response(build_month_summary(year, month))


class OperationsDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_operations_dashboard())


class TopSuppliersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get('limit', 5))
        except (TypeError, ValueError):
            limit = 5
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        if not year or not month:
            today = datetime.date.today()
            eth = EthiopianDateConverter.date_to_ethiopian(today)
            year, month = eth.year, eth.month
        return Response(build_top_suppliers(int(year), int(month), max(1, min(limit, 20))))
