'use client';

import { useQuery } from '@tanstack/react-query';
import { getOperationsDashboard, getTrendSummary } from '@/services/reports';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/hooks/useTranslation';
import PageHeader from '@/components/ui/PageHeader';
import TrendChart from '@/components/features/dashboard/TrendChart';
import UsagePieChart from '@/components/features/dashboard/UsagePieChart';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const now = EthDateTime.now();
  
  const ethMonths = [
    '', 'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];
  
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['operations-dashboard', now.year, now.month, now.date],
    queryFn: getOperationsDashboard,
  });

  const { data: trendData = [], isLoading: isLoadingTrend } = useQuery({
    queryKey: ['trend-summary', 14],
    queryFn: () => getTrendSummary(14),
  });

  const milk = operations?.milk;
  const finance = operations?.finance;
  const stats = {
    collected: milk?.collected || 0,
    delivered: milk?.delivered || 0,
    returned: milk?.returned || 0,
    processed: milk?.processed || 0,
    onHand: milk?.on_hand || 0,
    wasted: milk?.wasted || 0,
  };
  const sales = finance?.sales || 0;
  const receivable = finance?.receivable || 0;
  const payable = finance?.payable || 0;
  const totalExpenses = finance?.operational_expenses || 0;
  const milkCost = finance?.milk_cost || 0;
  const margin = finance?.profit || 0;

  const currentPeriodText = now.date <= 15 ? '1 — 15' : '16 — 30';

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      
      <PageHeader
        title={`${t('dashboard', 'goodMorning')}, ${session?.user?.name?.split(' ')[0] || 'User'}`}
        actions={
          <div className="inline-block rounded-full bg-surface-secondary px-4 py-1.5 text-sm font-medium text-muted border border-border">
            {t('dashboard', 'currentPeriod')}: {ethMonths[now.month]} {currentPeriodText}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        
        <section className="bg-surface rounded-[20px] p-6 lg:p-8 border border-border shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <h2 className="text-[18px] font-bold tracking-widest uppercase text-muted mb-8">
            {t('dashboard', 'todaysMilkFlow')}
            {isLoadingOperations && <span className="ml-3 text-xs normal-case tracking-normal">…</span>}
          </h2>

          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <div className="text-[40px] font-bold text-foreground leading-none">
                  {stats.collected} <span className="text-xl text-muted font-normal">L</span>
                </div>
                <div className="text-[14px] text-muted mt-1 font-medium">{t('dashboard', 'collected')}</div>
              </div>

              <div className="h-px bg-border w-full my-6"></div>

              <div className="space-y-4">
                <div className="flex items-center text-[16px]">
                  <span className="w-20 font-bold text-foreground">{stats.delivered} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-foreground font-medium">{t('dashboard', 'delivered')}</span>
                </div>

                <div className="flex items-center text-[16px]">
                  <span className="w-20 font-bold text-foreground">{stats.returned} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-foreground font-medium">{t('dashboard', 'returned')}</span>
                </div>
                
                <div className="flex items-center text-[16px]">
                  <span className="w-20 font-bold text-foreground">{stats.processed} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-foreground font-medium">{t('dashboard', 'processing')}</span>
                </div>
                
                <div className="flex items-center text-[16px]">
                  <span className={`w-20 font-bold ${stats.onHand < 0 ? 'text-danger' : 'text-foreground'}`}>{stats.onHand} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-foreground font-medium">{t('dashboard', 'onHand')}</span>
                </div>
                
                <div className="flex items-center text-[16px]">
                  <span className="w-20 font-bold text-danger">{stats.wasted} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-muted font-medium">{t('dashboard', 'waste')}</span>
                </div>
              </div>

              {stats.onHand < 0 && (
                <div className="mt-8 pt-6 border-t border-danger-subtle">
                  <div className="text-[24px] font-bold text-danger leading-none">
                    {Math.abs(stats.onHand)} <span className="text-lg font-normal">L</span>
                  </div>
                  <div className="text-[14px] text-danger mt-1 font-medium">{t('dashboard', 'needsAttention')}</div>
                </div>
              )}
            </div>
            
            <div className="w-full lg:w-1/2">
              <UsagePieChart 
                delivered={stats.delivered}
                processed={stats.processed}
                stored={Math.max(stats.onHand, 0)}
                wasted={stats.wasted}
              />
            </div>
          </div>
        </section>

        {/* Financial Section */}
        <section className="bg-surface rounded-[20px] p-6 lg:p-8 border border-border shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <h2 className="text-[18px] font-bold tracking-widest uppercase text-muted mb-8">
            {t('dashboard', 'currentSettlement')}
          </h2>

          <div className="space-y-8">
            
            <div>
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'sales')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {sales.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
              </div>
              {(finance?.walk_in_sales || 0) > 0 && (
                <div className="text-xs text-muted mt-1">{t('dashboard', 'walkInSales')}: {(finance?.walk_in_sales || 0).toLocaleString()} ETB</div>
              )}
            </div>

            <div>
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'receivable')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {receivable.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
              </div>
            </div>

            <div>
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'payable')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {payable.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
              </div>
            </div>

            <div>
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'milkCost')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {milkCost.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
              </div>
            </div>

            <div>
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'expenses')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {totalExpenses.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
              </div>
            </div>

            <div className="pt-8 border-t border-border">
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'estimatedMargin')}</div>
              <div className="text-[32px] font-bold text-primary">
                {margin.toLocaleString()} <span className="text-[18px] font-normal opacity-80">ETB</span>
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* 14-Day Trend Chart Section */}
      <section className="bg-surface rounded-[20px] p-6 lg:p-8 border border-border shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <h2 className="text-[18px] font-bold tracking-widest uppercase text-muted mb-8">
          Milk Flow Trend (Last 14 Days)
        </h2>
        
        {isLoadingTrend ? (
          <div className="h-[300px] w-full flex items-center justify-center bg-surface-secondary/20 rounded-[14px] animate-pulse">
            <span className="text-muted">Loading chart data...</span>
          </div>
        ) : (
          <TrendChart data={trendData} />
        )}
      </section>
    </div>
  );
}
