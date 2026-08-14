'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Download, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { getDashboardSummary } from '@/services/reports';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';

export default function ReportsPage() {
  const { t } = useTranslation();
  const now = EthDateTime.now();
  const [selectedMonth, setSelectedMonth] = useState(now.month);
  const [selectedYear, setSelectedYear] = useState(now.year);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary', selectedYear, selectedMonth],
    queryFn: () => getDashboardSummary(selectedYear, selectedMonth),
  });

  const ethMonths = [
    '', 'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('reports', 'title')}
        subtitle={t('reports', 'subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-secondary px-3 py-1.5 rounded-lg border border-border">
              <Calendar className="h-4 w-4 text-muted" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value) as any)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-foreground"
              >
                {ethMonths.map((m, idx) => {
                  if (idx === 0) return null;
                  return <option key={idx} value={idx}>{m} {selectedYear}</option>;
                })}
              </select>
            </div>
            <Button
              onClick={() => {}}
              leftIcon={<Download className="h-4 w-4" />}
              variant="outline"
            >
              {t('reports', 'exportCSV')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : isError ? (
          <div className="col-span-3 text-center text-danger py-4">{t('reports', 'failedToLoad')} <button onClick={() => refetch()} className="underline font-medium">{t('reports', 'retry')}</button></div>
        ) : (
          <>
            <div className="bg-surface rounded-[14px] border border-border p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-colors hover:border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-info-subtle text-info rounded-[10px] flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{t('reports', 'monthlyRevenue')}</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">{(data?.revenue || 0).toLocaleString()} ETB</p>
              <p className="text-sm text-muted mt-1">{t('reports', 'fromMilkDistributions')}</p>
            </div>
            
            <div className="bg-surface rounded-[14px] border border-border p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-colors hover:border-danger/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-danger-subtle text-danger rounded-[10px] flex items-center justify-center">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{t('reports', 'monthlyExpenses')}</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">{(data?.total_expenses || 0).toLocaleString()} ETB</p>
              <p className="text-sm text-muted mt-1">{t('reports', 'supplierPaymentsAndLogistics')}</p>
            </div>
            
            <div className="bg-surface rounded-[14px] border border-border p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-colors hover:border-success/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-success-subtle text-success rounded-[10px] flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{t('reports', 'netMargin')}</h3>
              </div>
              <p className={`text-2xl font-bold ${(data?.net_margin || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {(data?.net_margin || 0).toLocaleString()} ETB
              </p>
              <p className="text-sm text-muted mt-1">{t('reports', 'overallProfitability')}</p>
            </div>
          </>
        )}
      </div>

      <EmptyState
        icon={<FileText />}
        title={t('reports', 'advancedReportingUnderConstruction')}
        description={t('reports', 'advancedReportingDesc')}
      />
    </div>
  );
}
