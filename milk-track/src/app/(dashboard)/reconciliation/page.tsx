'use client';

import { useQuery } from '@tanstack/react-query';
import { getDailyReconciliation } from '@/services/reconciliation';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw,
  Droplets,
  Truck,
  Factory,
  Trash2,
  Package
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import WastageModal from '@/components/features/inventory/WastageModal';

export default function ReconciliationPage() {
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const now = EthDateTime.now();
  const { t } = useTranslation();

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['reconciliation', now.year, now.month, now.date],
    queryFn: () => getDailyReconciliation(now.year, now.month, now.date),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('reconciliation', 'title')}
        subtitle={t('reconciliation', 'subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsWastageModalOpen(true)}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Log Wastage
            </Button>
            <div className="flex items-center bg-surface px-4 py-2 rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border">
              <button onClick={() => refetch()} className="text-muted hover:text-primary transition-colors p-1 rounded-[10px] hover:bg-primary-light/10">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError ? (
        <EmptyState 
          icon={<AlertTriangle />}
          title="Failed to load ledger"
          description="There was an error communicating with the server."
        />
      ) : !report ? (
        <EmptyState 
          icon={<Droplets />}
          title="No reconciliation data"
          description="There is no data available for today yet."
        />
      ) : (
        <>
          {/* Status Banners */}
          {!report.is_reconciled ? (
            <div className="bg-warning-subtle border-l-4 border-warning p-4 rounded-r-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-warning">
                    {t('reconciliation', 'actionRequired')}: {Math.abs(report.net_balance)} {t('reconciliation', 'litersNotReconciled')}
                  </h3>
                  <p className="mt-1 text-sm text-warning/80">
                    {t('reconciliation', 'actionRequiredDesc')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-success-subtle border-l-4 border-success p-4 rounded-r-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-success">{t('reconciliation', 'fullyReconciled')}</h3>
                  <p className="mt-1 text-sm text-success/80">
                    {t('reconciliation', 'fullyReconciledDesc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incoming Milk */}
            <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-info-subtle/50">
                <div className="flex items-center text-info mb-2">
                  <ArrowDownRight className="h-5 w-5 mr-2" />
                  <h2 className="text-lg font-semibold">{t('reconciliation', 'availableMilk')}</h2>
                </div>
                <p className="text-4xl font-bold text-foreground">{report.total_available} <span className="text-xl text-muted font-medium">L</span></p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
                  <div className="flex items-center text-foreground">
                    <div className="h-8 w-8 rounded-full bg-info-subtle border border-info/20 flex items-center justify-center mr-3">
                      <Droplets className="h-4 w-4 text-info" />
                    </div>
                    {t('reconciliation', 'collectedFromSuppliers')}
                  </div>
                  <span className="font-semibold text-foreground">{report.collected} L</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
                  <div className="flex items-center text-foreground">
                    <div className="h-8 w-8 rounded-full bg-warning-subtle border border-warning/20 flex items-center justify-center mr-3">
                      <RefreshCw className="h-4 w-4 text-warning" />
                    </div>
                    {t('reconciliation', 'returnedFromCustomers')}
                  </div>
                  <span className="font-semibold text-foreground">{report.returned} L</span>
                </div>
              </div>
            </div>

            {/* Outgoing Milk */}
            <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-primary-light/10">
                <div className="flex items-center text-primary mb-2">
                  <ArrowUpRight className="h-5 w-5 mr-2" />
                  <h2 className="text-lg font-semibold">{t('reconciliation', 'accountedFor')}</h2>
                </div>
                <p className="text-4xl font-bold text-foreground">{report.total_accounted_out} <span className="text-xl text-muted font-medium">L</span></p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
                  <div className="flex items-center text-foreground">
                    <div className="h-8 w-8 rounded-full bg-success-subtle border border-success/20 flex items-center justify-center mr-3">
                      <Truck className="h-4 w-4 text-success" />
                    </div>
                    {t('reconciliation', 'deliveredSold')}
                  </div>
                  <span className="font-semibold text-foreground">{report.delivered} L</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
                  <div className="flex items-center text-foreground">
                    <div className="h-8 w-8 rounded-full bg-primary-light/30 border border-primary-light/50 flex items-center justify-center mr-3">
                      <Factory className="h-4 w-4 text-primary" />
                    </div>
                    {t('reconciliation', 'processed')}
                  </div>
                  <span className="font-semibold text-foreground">{report.processed} L</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
                  <div className="flex items-center text-foreground">
                    <div className="h-8 w-8 rounded-full bg-surface-secondary border border-border flex items-center justify-center mr-3">
                      <Package className="h-4 w-4 text-foreground" />
                    </div>
                    {t('reconciliation', 'stored')}
                  </div>
                  <span className="font-semibold text-foreground">{report.stored} L</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
                  <div className="flex items-center text-foreground">
                    <div className="h-8 w-8 rounded-full bg-danger-subtle border border-danger/20 flex items-center justify-center mr-3">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </div>
                    {t('reconciliation', 'wastedSpoiled')}
                  </div>
                  <span className="font-semibold text-foreground">{report.wasted} L</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isWastageModalOpen && (
        <WastageModal 
          isOpen={isWastageModalOpen} 
          onClose={() => setIsWastageModalOpen(false)} 
        />
      )}
    </div>
  );
}
