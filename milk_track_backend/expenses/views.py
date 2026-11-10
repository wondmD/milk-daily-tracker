from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Expense
from .serializers import ExpenseSerializer
from settlements.models import SettlementPeriod


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-created_at')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Auto-assign settlement period from the ethiopian_date if not provided
        settlement_period = serializer.validated_data.get('settlement_period')
        if not settlement_period:
            eth_date = serializer.validated_data.get('ethiopian_date', '')
            # ethiopian_date is stored as "YYYY-MM-DD"; convert to named format for period lookup
            period = None
            try:
                parts = eth_date.split('-')
                if len(parts) == 3:
                    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                    months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
                              'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume']
                    if 1 <= month <= 13:
                        named_date = f"{months[month - 1]} {day}, {year}"
                        period = SettlementPeriod.get_period_for_ethiopian_date(named_date)
            except Exception:
                pass
            if period is None:
                period = SettlementPeriod.ensure_current_period()
            serializer.save(recorded_by=self.request.user, settlement_period=period)
        else:
            serializer.save(recorded_by=self.request.user)


    @action(detail=False, methods=['get'])
    def by_period(self, request):
        """
        Returns expenses grouped by settlement period.
        Current period comes first; past periods follow in descending order.
        Each group: { period_id, period_name, period_start, period_end,
                      is_current, total_amount, expenses: [...] }
        """
        current_period = SettlementPeriod.ensure_current_period()

        # Fetch all settlement periods that have expenses, plus the current one
        periods_with_expenses = (
            SettlementPeriod.objects.filter(expense__isnull=False)
            .distinct()
            .order_by('-ethiopian_year', '-ethiopian_month', '-period_number')
        )

        # Make sure the current period is always included
        period_ids = list(periods_with_expenses.values_list('id', flat=True))
        if current_period.id not in period_ids:
            period_ids.insert(0, current_period.id)

        # Re-fetch ordered: current first, rest in descending order
        all_periods = list(SettlementPeriod.objects.filter(id__in=period_ids).order_by(
            '-ethiopian_year', '-ethiopian_month', '-period_number'
        ))

        # Move current period to front
        all_periods = sorted(
            all_periods,
            key=lambda p: (0 if p.id == current_period.id else 1,
                           -p.ethiopian_year, -p.ethiopian_month, -p.period_number)
        )

        result = []
        for period in all_periods:
            expenses = Expense.objects.filter(settlement_period=period).order_by('-created_at')
            serialized = ExpenseSerializer(expenses, many=True).data
            total_amount = sum(float(e.amount) for e in expenses)

            result.append({
                'period_id': period.id,
                'period_name': str(period),
                'period_start': period.start_date_ethiopian,
                'period_end': period.end_date_ethiopian,
                'is_current': period.id == current_period.id,
                'total_amount': round(total_amount, 2),
                'expenses': serialized,
            })

        # Also include expenses with no settlement period under "Unassigned"
        unassigned = Expense.objects.filter(settlement_period__isnull=True).order_by('-created_at')
        if unassigned.exists():
            serialized_unassigned = ExpenseSerializer(unassigned, many=True).data
            total_unassigned = sum(float(e.amount) for e in unassigned)
            result.append({
                'period_id': None,
                'period_name': 'Unassigned',
                'period_start': None,
                'period_end': None,
                'is_current': False,
                'total_amount': round(total_unassigned, 2),
                'expenses': serialized_unassigned,
            })

        return Response(result)

