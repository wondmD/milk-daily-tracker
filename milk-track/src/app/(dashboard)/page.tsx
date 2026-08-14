'use client';

import { useQuery } from '@tanstack/react-query';
import { getDailyReconciliation } from '@/services/reconciliation';
import { getExpenses } from '@/services/expenses';
import { getTrendSummary } from '@/services/reports';
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
  
  const { data: reconciliation } = useQuery({
    queryKey: ['daily-reconciliation', now.year, now.month, now.date],
    queryFn: () => getDailyReconciliation(now.year, now.month, now.date),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
  });

  const { data: trendData = [], isLoading: isLoadingTrend } = useQuery({
    queryKey: ['trend-summary'],
    queryFn: () => getTrendSummary(14),
  });

  const stats = {
    collected: reconciliation?.collected || 0,
    delivered: reconciliation?.delivered || 0,
    processed: reconciliation?.processed || 0,
    stored: reconciliation?.stored || 0,
    wasted: reconciliation?.wasted || 0,
    unreconciled: Math.abs(reconciliation?.net_balance || 0),
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const estimatedReceivables = stats.delivered * 65;
  const estimatedPayables = stats.collected * 50; 
  const margin = estimatedReceivables - estimatedPayables - totalExpenses;

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
                  <span className="w-20 font-bold text-foreground">{stats.processed} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-foreground font-medium">{t('dashboard', 'processing')}</span>
                </div>
                
                <div className="flex items-center text-[16px]">
                  <span className="w-20 font-bold text-foreground">{stats.stored} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-foreground font-medium">{t('dashboard', 'storage')}</span>
                </div>
                
                <div className="flex items-center text-[16px]">
                  <span className="w-20 font-bold text-danger">{stats.wasted} L</span>
                  <span className="text-muted mx-4">→</span>
                  <span className="text-muted font-medium">{t('dashboard', 'waste')}</span>
                </div>
              </div>

              {stats.unreconciled > 0 && (
                <div className="mt-8 pt-6 border-t border-danger-subtle">
                  <div className="text-[24px] font-bold text-danger leading-none">
                    {stats.unreconciled} <span className="text-lg font-normal">L</span>
                  </div>
                  <div className="text-[14px] text-danger mt-1 font-medium">{t('dashboard', 'needsAttention')}</div>
                </div>
              )}
            </div>
            
            <div className="w-full lg:w-1/2">
              <UsagePieChart 
                delivered={stats.delivered}
                processed={stats.processed}
                stored={stats.stored}
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
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'receivable')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {estimatedReceivables.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
              </div>
            </div>

            <div>
              <div className="text-[14px] text-muted font-medium mb-1">{t('dashboard', 'payable')}</div>
              <div className="text-[24px] font-bold text-foreground">
                {estimatedPayables.toLocaleString()} <span className="text-[16px] font-normal text-muted">ETB</span>
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
